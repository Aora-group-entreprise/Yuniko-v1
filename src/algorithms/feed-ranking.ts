import type { FeedPost } from "../features/feed/feed.schema";

export type FeedRankingSignals = {
  followingIds: Set<string>;
  affinityByAuthor: Map<string, number>;
  topicAffinity: Map<string, number>;
  hiddenAuthorIds?: Set<string>;
  reportedAuthorIds?: Set<string>;
  unfollowedAuthorIds?: Set<string>;
  quickScrollPostIds?: Set<string>;
  distributionFactorByPost?: Map<string, number>;
  now?: number;
};

type RankedPost = { post: FeedPost; score: number; index: number; engagement: number };

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

function cosineTopicSimilarity(post: FeedPost, topics: Map<string, number>): number {
  if (!post.hashtags.length || !topics.size) return 0;
  let dot = 0;
  let postNorm = 0;
  let userNorm = 0;
  const seen = new Set<string>();

  for (const rawTag of post.hashtags) {
    const tag = rawTag.toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    const postValue = 1;
    const userValue = topics.get(tag) ?? 0;
    dot += postValue * userValue;
    postNorm += postValue * postValue;
    userNorm += userValue * userValue;
  }

  if (!postNorm || !userNorm) return 0;
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(postNorm) * Math.sqrt(userNorm))));
}

function penalty(post: FeedPost, signals: FeedRankingSignals): number {
  const author = post.author.id;
  return Math.min(
    1,
    (signals.hiddenAuthorIds?.has(author) ? 0.4 : 0) +
    (signals.reportedAuthorIds?.has(author) ? 0.3 : 0) +
    (signals.unfollowedAuthorIds?.has(author) ? 0.2 : 0) +
    (signals.quickScrollPostIds?.has(post.id) ? 0.1 : 0),
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
  const p = cosineTopicSimilarity(post, signals.topicAffinity);
  const q = quality(post);
  const n = penalty(post, signals);
  const d = Math.min(1, Math.max(0, signals.distributionFactorByPost?.get(post.id) ?? 1));

  return (0.30 * eNorm + 0.20 * vNorm + 0.15 * recency + 0.20 * r + 0.10 * p + 0.05 * q) * (1 - n) * d;
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
  const medianEngagement = [...engagementValues].sort((a, b) => a - b)[Math.floor(engagementValues.length / 2)] ?? 0;

  const ranked: RankedPost[] = posts.map((post, index) => ({
    post,
    score: baseScore(post, signals, now, e90, v90),
    index,
    engagement: engagement(post),
  }));
  ranked.sort((a, b) => Math.abs(b.score - a.score) > 0.000001 ? b.score - a.score : b.index - a.index);

  const secondChance = ranked.filter(item => item.post.viewCount < 200 && item.engagement > medianEngagement + 0.15);
  const secondChanceIds = new Set(secondChance.map(item => item.post.id));
  const remaining = ranked.filter(item => !secondChanceIds.has(item.post.id));
  const ordered = [...secondChance, ...remaining];

  const result: FeedPost[] = [];
  const remainingItems = [...ordered];

  while (remainingItems.length) {
    const window = result.slice(-WINDOW_SIZE);
    const authorCounts = new Map<string, number>();
    const subjectCounts = new Map<string, number>();

    for (const item of window) {
      authorCounts.set(item.author.id, (authorCounts.get(item.author.id) ?? 0) + 1);
      for (const tag of item.hashtags) {
        const key = tag.toLowerCase();
        subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
      }
    }

    const candidateIndex = remainingItems.findIndex(item => {
      if ((authorCounts.get(item.post.author.id) ?? 0) >= MAX_AUTHOR_IN_WINDOW) return false;
      if (!item.post.hashtags.length) return true;
      return item.post.hashtags.some(tag => (subjectCounts.get(tag.toLowerCase()) ?? 0) / Math.max(window.length + 1, 1) < MAX_SUBJECT_SHARE);
    });

    result.push(remainingItems.splice(candidateIndex >= 0 ? candidateIndex : 0, 1)[0].post);
  }

  return result;
}
