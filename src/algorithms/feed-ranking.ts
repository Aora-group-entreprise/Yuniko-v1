import type { FeedPost } from "../features/feed/feed.schema";

export type FeedRankingSignals = {
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  seenPostIds: Set<string>;
  affinityByAuthor: Map<string, number>;
  now?: number;
};

function freshness(createdAt: string, now: number): number {
  const ageHours = Math.max(0, (now - Date.parse(createdAt)) / 3_600_000);
  return Math.exp(-ageHours / 72);
}

function engagement(post: FeedPost): number {
  const raw = post.likeCount + post.commentCount * 2 + post.saveCount * 3 + post.shareCount * 3;
  return Math.min(1, Math.log1p(raw) / Math.log1p(10_000));
}

/** Pure ranking only. No storage, network, or framework dependencies. */
export function rankFeedPosts(posts: FeedPost[], signals: FeedRankingSignals): FeedPost[] {
  const now = signals.now ?? Date.now();
  return posts
    .map((post, index) => {
      const affinity = Math.min(1, (signals.affinityByAuthor.get(post.author.id) ?? 0) / 10);
      const fresh = freshness(post.createdAt, now);
      const engaged = engagement(post);
      const seenPenalty = signals.seenPostIds.has(post.id) ? 0.28 : 1;
      const personalBoost = signals.likedPostIds.has(post.id) ? 0.08 : 0;
      const saveBoost = signals.savedPostIds.has(post.id) ? 0.12 : 0;
      const positionStability = Math.max(0, 1 - index / Math.max(1, posts.length)) * 0.02;
      const score = (fresh * 0.34 + engaged * 0.28 + affinity * 0.26 + personalBoost + saveBoost + positionStability) * seenPenalty;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}
