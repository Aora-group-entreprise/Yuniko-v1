import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";
import { listPosts } from "../posts/post-read.service";
import { getFollowingProfileIds } from "../follow/follow.service";
import { getPostCounters } from "../counters/counters.service";
import { getDistributionDecision, type DistributionAudience } from "../../algorithms/feed-distribution";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const LOCAL_COUNTRY = "MG";
const WORLD_COHORT_KEY = "yuniko.world-cohort.v1";
const DEFAULT_WORLD_COHORT = ["MG", "FR", "US", "BR", "IN", "NG", "JP"];

const demoStories: ChronologicalFeed["stories"] = [
  { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
  { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
  { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
];

/** Phase 2 boundary: chronological following feed. */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  const [posts, followingIds] = await Promise.all([listPosts(), Promise.resolve(getFollowingProfileIds())]);
  const following = new Set(followingIds);
  const visiblePosts = posts.filter((post) => following.has(post.author.id));
  const visibleStories = demoStories.filter((story) => following.has(story.author.id));

  return chronologicalFeedSchema.parse({ stories: visibleStories, posts: visiblePosts });
}

function readWorldCohort(): string[] {
  if (typeof window === "undefined") return DEFAULT_WORLD_COHORT;
  try {
    const stored = JSON.parse(window.localStorage.getItem(WORLD_COHORT_KEY) ?? "[]");
    if (!Array.isArray(stored)) return DEFAULT_WORLD_COHORT;
    const countries = stored.filter((value): value is string => typeof value === "string");
    return countries.length >= 3 ? countries : DEFAULT_WORLD_COHORT;
  } catch {
    return DEFAULT_WORLD_COHORT;
  }
}

function getLocalAudience(post: ChronologicalFeed["posts"][number]): DistributionAudience {
  const counters = getPostCounters(post.id, {
    likes: post.likeCount,
    comments: post.commentCount,
    saves: post.saveCount,
    shares: post.shareCount,
  });

  return {
    likeCount: counters.likes,
    commentCount: counters.comments,
    saveCount: counters.saves,
    shareCount: counters.shares,
    viewCount: post.viewCount,
  };
}

/**
 * World Feed distribution boundary.
 * Every new post begins in the first 3 countries of the world cohort.
 * Strong audience signals promote it to 5, then 7, then worldwide.
 * Frontend-only prototype: local event-derived counters stand in for the
 * eventual server-side per-country audience measurements.
 */
export function getWorldDistributedPosts(posts: ChronologicalFeed["posts"]): ChronologicalFeed["posts"] {
  const cohort = readWorldCohort();

  return posts.filter((post) => {
    const decision = getDistributionDecision(getLocalAudience(post), cohort);
    return decision.isGlobal || decision.countries.includes(LOCAL_COUNTRY);
  });
}

/** World Feed: all posts pass through progressive distribution before ranking. */
export async function getWorldFeed(): Promise<ChronologicalFeed> {
  const posts = await listPosts();
  return chronologicalFeedSchema.parse({
    stories: demoStories,
    posts: getWorldDistributedPosts(posts),
  });
}
