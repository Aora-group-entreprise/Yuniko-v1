import type { FeedPost } from "../features/feed/feed.schema";

export type FeedRankingSignals = {
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  seenPostIds: Set<string>;
  affinityByAuthor: Map<string, number>;
  now?: number;
};

function freshness(createdAt: string, now: number): number {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return 0;
  const ageHours = Math.max(0, (now - timestamp) / 3_600_000);
  return Math.exp(-ageHours / 72);
}

function engagement(post: FeedPost): number {
  const raw = post.likeCount + post.commentCount * 2 + post.saveCount * 3 + post.shareCount * 3;
  return Math.min(1, Math.log1p(Math.max(0, raw)) / Math.log1p(10_000));
}

function affinityScore(authorId: string, affinityByAuthor: Map<string, number>): number {
  return Math.min(1, Math.max(0, affinityByAuthor.get(authorId) ?? 0) / 10);
}

/** Pure ranking only. No storage, network, or framework dependencies. */
export function rankFeedPosts(posts: FeedPost[], signals: FeedRankingSignals): FeedPost[] {
  const now = signals.now ?? Date.now();

  const scored = posts.map((post, index) => {
    const fresh = freshness(post.createdAt, now);
    const engaged = engagement(post);
    const affinity = affinityScore(post.author.id, signals.affinityByAuthor);
    const unseenBoost = signals.seenPostIds.has(post.id) ? 0 : 0.16;
    const likedBoost = signals.likedPostIds.has(post.id) ? 0.08 : 0;
    const savedBoost = signals.savedPostIds.has(post.id) ? 0.12 : 0;
    const stability = Math.max(0, 1 - index / Math.max(1, posts.length)) * 0.02;

    const score =
      fresh * 0.34 +
      engaged * 0.25 +
      affinity * 0.23 +
      unseenBoost +
      likedBoost +
      savedBoost +
      stability;

    return { post, score, index };
  });

  scored.sort((a, b) => {
    const scoreDelta = b.score - a.score;
    if (Math.abs(scoreDelta) > 0.000001) return scoreDelta;

    const dateDelta = Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt);
    if (Number.isFinite(dateDelta) && dateDelta !== 0) return dateDelta;

    return a.index - b.index;
  });

  return scored.map(({ post }) => post);
}
