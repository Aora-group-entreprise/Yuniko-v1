import type { FeedPost } from "../features/feed/feed.schema";

export type FeedRankingSignals = {
  followingIds: Set<string>;
  affinityByAuthor: Map<string, number>;
  topicAffinity: Map<string, number>;
  hiddenAuthorIds?: Set<string>;
  reportedAuthorIds?: Set<string>;
  unfollowedAuthorIds?: Set<string>;
  now?: number;
};

type RankedPost = { post: FeedPost; score: number; index: number };

const HALF_LIFE_HOURS = 12;
const MAX_AUTHOR_IN_WINDOW = 2;
const WINDOW_SIZE = 20;
const MAX_SUBJECT_SHARE = 0.4;

function freshness(createdAt: string, now: number): number {
  const deltaHours = Math.max(0, (now - Date.parse(createdAt)) / 3_600_000);
  return Math.exp(-Math.log(2) * deltaHours / HALF_LIFE_HOURS);
}

function engagement(post: FeedPost): number {
  const impressions = Math.max(post.viewCount, 1);
  return (post.likeCount + 3 * post.commentCount + 4 * post.saveCount + 5 * post.shareCount + 2 * post.viewCount) / impressions;
}

function percentile90(values: number[]): number {
  if (!values.length) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.max(sorted[Math.floor((sorted.length - 1) * 0.9)] ?? 0, 0.0001);
}

function cosineSimilarity(a: number, b: number): number {
  if (!a || !b) return 0;
  return Math.max(-1, Math.min(1, (a * b) / (Math.abs(a) * Math.abs(b))));
}

function topicScore(post: FeedPost, topics: Map<string, number>): number {
  if (!post.hashtags.length || !topics.size) return 0;
  const scores = post.hashtags.map(tag => topics.get(tag.toLowerCase()) ?? 0);
  return Math.min(1, Math.max(0, scores.reduce((sum, value) => sum + value, 0) / scores.length / 10));
}

function penalty(post: FeedPost, signals: FeedRankingSignals): number {
  const author = post.author.id;
  return Math.min(
    1,
    (signals.hiddenAuthorIds?.has(author) ? 0.7 : 0) +
    (signals.reportedAuthorIds?.has(author) ? 0.3 : 0) +
    (signals.unfollowedAuthorIds?.has(author) ? 0.2 : 0),
  );
}

function quality(post: FeedPost): number {
  const engagementRate = (post.likeCount + post.commentCount + post.saveCount + post.shareCount) / Math.max(post.viewCount, 1);
  return Math.min(1, Math.max(0, 0.5 + engagementRate * 2));
}

function baseScore(post: FeedPost, signals: FeedRankingSignals, now: number, e90: number, v90: number): number {
  const e = engagement(post);
  const ageHours = Math.max((now - Date.parse(post.createdAt)) / 3_600_000, 0.5);
  const velocity = e / ageHours;
  const eNorm = Math.min(e / e90, 1);
  const vNorm = Math.min(velocity / v90, 1);
  const recency = freshness(post.createdAt, now);
  const following = signals.followingIds.has(post.author.id) ? 1 : 0;
  const affinity = Math.min(1, Math.max(0, (signals.affinityByAuthor.get(post.author.id) ?? 0) / 10));
  const r = 0.5 * affinity + 0.3 * following + 0.2 * recency;
  const p = cosineSimilarity(topicScore(post, signals.topicAffinity), topicScore(post, signals.topicAffinity));
  const q = quality(post);
  const n = penalty(post, signals);
  return (0.30 * eNorm + 0.20 * vNorm + 0.15 * recency + 0.20 * r + 0.10 * p + 0.05 * q) * (1 - n);
}

export function rankFeedPosts(posts: FeedPost[], signals: FeedRankingSignals): FeedPost[] {
  if (!posts.length) return [];
  const now = signals.now ?? Date.now();
  const engagementValues = posts.map(engagement);
  const velocityValues = posts.map(post => {
    const age = Math.max((now - Date.parse(post.createdAt)) / 3_600_000, 0.5);
    return engagement(post) / age;
  });
  const e90 = percentile90(engagementValues);
  const v90 = percentile90(velocityValues);

  const ranked: RankedPost[] = posts.map((post, index) => ({
    post,
    score: baseScore(post, signals, now, e90, v90),
    index,
  }));
  ranked.sort((a, b) => Math.abs(b.score - a.score) > 0.000001 ? b.score - a.score : b.index - a.index);

  const result: FeedPost[] = [];
  const remaining = [...ranked];
  while (remaining.length) {
    const window = result.slice(-WINDOW_SIZE);
    const authorCounts = new Map<string, number>();
    const subjectCounts = new Map<string, number>();
    for (const item of window) {
      authorCounts.set(item.author.id, (authorCounts.get(item.author.id) ?? 0) + 1);
      for (const tag of item.post.hashtags) subjectCounts.set(tag.toLowerCase(), (subjectCounts.get(tag.toLowerCase()) ?? 0) + 1);
    }

    const candidateIndex = remaining.findIndex(item => {
      const authorCount = authorCounts.get(item.post.author.id) ?? 0;
      if (authorCount >= MAX_AUTHOR_IN_WINDOW) return false;
      if (!item.post.hashtags.length) return true;
      return item.post.hashtags.some(tag => (subjectCounts.get(tag.toLowerCase()) ?? 0) / Math.max(window.length + 1, 1) < MAX_SUBJECT_SHARE);
    });
    result.push(remaining.splice(candidateIndex >= 0 ? candidateIndex : 0, 1)[0].post);
  }
  return result;
}
