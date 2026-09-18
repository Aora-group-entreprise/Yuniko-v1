import type { FeedPost } from "../features/feed/feed.schema";

export type FeedRankingSignals = {
  followingIds: Set<string>;
  affinityByAuthor: Map<string, number>;
  topicAffinity: Map<string, number>;
  now?: number;
};

type RankedPost = { post: FeedPost; score: number; index: number };

function freshness(createdAt: string, now: number): number {
  const deltaHours = Math.max(0, (now - Date.parse(createdAt)) / 3_600_000);
  return Math.exp(-Math.log(2) * deltaHours / 12);
}

function engagement(post: FeedPost): number {
  const impressions = Math.max(post.viewCount, 1);
  return (post.likeCount + 3 * post.commentCount + 4 * post.saveCount + 5 * post.shareCount + 2 * impressions) / impressions;
}

function percentile90(values: number[]): number {
  if (!values.length) return 1;
  const sorted = [...values].sort((a,b) => a-b);
  return Math.max(sorted[Math.floor((sorted.length - 1) * 0.9)], 0.0001);
}

function topicScore(_post: FeedPost, _topics: Map<string, number>): number {
  return 0;
}

function baseScore(post: FeedPost, signals: FeedRankingSignals, now: number, velocity90: number): number {
  const e = engagement(post);
  const v = Math.min((e / Math.max((now - Date.parse(post.createdAt)) / 3_600_000, 0.5)) / velocity90, 1);
  const r = signals.followingIds.has(post.author.id) ? 1 : Math.min(1, Math.max(0, signals.affinityByAuthor.get(post.author.id) ?? 0) / 10);
  const p = topicScore(post, signals.topicAffinity);
  const quality = Math.min(1, (post.likeCount + post.commentCount + post.saveCount + post.shareCount + 1) / 100);
  return 0.30 * Math.min(e / 20, 1) + 0.20 * v + 0.15 * freshness(post.createdAt, now) + 0.20 * r + 0.10 * p + 0.05 * quality;
}

export function rankFeedPosts(posts: FeedPost[], signals: FeedRankingSignals): FeedPost[] {
  const now = signals.now ?? Date.now();
  const engagementValues = posts.map(engagement);
  const velocityValues = posts.map(post => {
    const age = Math.max((now - Date.parse(post.createdAt)) / 3_600_000, 0.5);
    return engagement(post) / age;
  });
  const e90 = percentile90(engagementValues);
  const v90 = percentile90(velocityValues);

  const ranked: RankedPost[] = posts.map((post,index) => ({
    post,
    score: baseScore(post, signals, now, v90 / Math.max(e90, 0.0001)),
    index,
  }));
  ranked.sort((a,b) => Math.abs(b.score-a.score) > 0.000001 ? b.score-a.score : b.index-a.index);

  const result: RankedPost[] = [];
  const remaining = [...ranked];
  while (remaining.length) {
    const recentAuthors = new Set(result.slice(-2).map(item => item.post.author.id));
    const candidate = remaining.findIndex(item => !recentAuthors.has(item.post.author.id));
    result.push(remaining.splice(candidate >= 0 ? candidate : 0, 1)[0]);
  }
  return result.map(item => item.post);
}
