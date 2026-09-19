import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { chronologicalFeedSchema, type ChronologicalFeed, type FeedPost } from "./feed.schema";
import { getBlockedUserIds } from "../moderation/moderation.service";

export type FeedCursor = { createdAt: string; id: string } | null;
export type FeedPage = ChronologicalFeed & { nextCursor: FeedCursor; hasMore: boolean };

const PAGE_SIZE = 20;
const CANDIDATE_BATCH = 80;
const SEEN_WINDOW_DAYS = 7;

function extractHashtags(caption: string): string[] {
  return [...caption.matchAll(/(^|\s)#([\p{L}\p{N}_-]{1,64})/gu)].map(match => match[2].toLowerCase());
}

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

async function loadFeedPosts(rows: Array<Record<string, unknown>>): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const db = requireYunikoDb();
  const authorIds = [...new Set(rows.map(row => String(row.author_id)))];
  const postIds = rows.map(row => String(row.id));
  const [{ data: authors, error: authorError }, { data: media, error: mediaError }] = await Promise.all([
    db.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds),
    db.from("post_media").select("post_id,url,position").in("post_id", postIds).eq("status","ready").order("position",{ascending:true}),
  ]);
  if (authorError) throw authorError;
  if (mediaError) throw mediaError;
  const authorMap = new Map((authors ?? []).map(author => [author.id, author]));
  const mediaMap = new Map<string,string>();
  for (const item of media ?? []) if (!mediaMap.has(item.post_id)) mediaMap.set(item.post_id, item.url);

  return chronologicalFeedSchema.shape.posts.parse(rows.map(row => {
    const author = authorMap.get(row.author_id as string);
    const mediaUrl = mediaMap.get(row.id as string);
    if (!author || !mediaUrl) return null;
    return {
      id: row.id,
      author: { id: author.id, username: author.username, displayName: author.display_name, avatarUrl: author.avatar_url ?? "" },
      mediaUrl,
      caption: row.caption ?? "",
      hashtags: extractHashtags(String(row.caption ?? "")),
      likeCount: row.like_count ?? 0,
      commentCount: row.comment_count ?? 0,
      saveCount: row.save_count ?? 0,
      shareCount: row.share_count ?? 0,
      viewCount: row.view_count ?? 0,
      createdAt: row.created_at,
    };
  }).filter(Boolean));
}

export async function getFeedPage(cursor: FeedCursor = null): Promise<FeedPage> {
  const userId = await currentUserId();
  const db = requireYunikoDb();
  const blocked = new Set(await getBlockedUserIds());
  const { data: viewerProfile, error: viewerProfileError } = await db.from("profiles").select("country_code").eq("id", userId).maybeSingle();
  if (viewerProfileError) throw viewerProfileError;
  const viewerCountry = typeof viewerProfile?.country_code === "string" ? viewerProfile.country_code.toUpperCase() : null;
  const seenCutoff = new Date(Date.now() - SEEN_WINDOW_DAYS * 86_400_000).toISOString();

  const { data: seenRows, error: seenError } = await db.from("seen_posts")
    .select("post_id").eq("user_id", userId).gte("seen_at", seenCutoff);
  if (seenError) throw seenError;
  const seenIds = (seenRows ?? []).map(row => row.post_id);

  const [{ data: follows, error: followsError }, { data: affinities, error: affinityError }] = await Promise.all([
    db.from("follows").select("following_id").eq("follower_id", userId).eq("status", "accepted").limit(100),
    db.from("user_affinity").select("target_user_id,score").eq("user_id", userId).order("score", { ascending: false }).limit(100),
  ]);
  if (followsError) throw followsError;
  if (affinityError) throw affinityError;

  const authorIds = [...new Set([
    ...(follows ?? []).map(row => row.following_id),
    ...(affinities ?? []).filter(row => Number(row.score) > 0).map(row => row.target_user_id),
  ])].slice(0, 150);

  const baseSelect = "id,author_id,caption,created_at,like_count,comment_count,save_count,share_count,view_count";
  const buildQuery = (seed: "personalized" | "global") => {
    let q = db.from("posts").select(baseSelect).eq("status","ready").is("deleted_at",null)
      .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(seed === "personalized" ? 60 : CANDIDATE_BATCH);
    if (seed === "personalized" && authorIds.length) q = q.in("author_id", authorIds);
    if (cursor) q = q.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    if (seenIds.length) q = q.not("id","in",`(${seenIds.join(",")})`);
    return q;
  };

  const [{ data: personalizedRows, error: personalizedError }, { data: globalRows, error: globalError }] = await Promise.all([
    authorIds.length ? buildQuery("personalized") : Promise.resolve({ data: [], error: null }),
    buildQuery("global"),
  ]);
  if (personalizedError) throw personalizedError;
  if (globalError) throw globalError;

  const rowMap = new Map<string, Record<string, unknown>>();
  for (const row of [...(personalizedRows ?? []), ...(globalRows ?? [])]) rowMap.set(row.id, row);
  const rows = [...rowMap.values()].sort((a,b) => {
    const ad = Date.parse(String(a.created_at)); const bd = Date.parse(String(b.created_at));
    return bd - ad || String(b.id).localeCompare(String(a.id));
  }).slice(0, CANDIDATE_BATCH);

  const candidateIds = (rows ?? []).map(row => row.id);
  const { data: distributions, error: distributionError } = candidateIds.length
    ? await db.from("post_distribution").select("post_id,stage,countries,status").in("post_id", candidateIds)
    : { data: [], error: null };
  if (distributionError) throw distributionError;
  const distributionMap = new Map((distributions ?? []).map(row => [row.post_id, row]));
  const visibleRows = (rows ?? []).filter(row => {
    if (blocked.has(row.author_id)) return false;
    const distribution = distributionMap.get(row.id);
    if (!distribution || distribution.status === "active" && (!Array.isArray(distribution.countries) || distribution.countries.length === 0)) return true;
    if (distribution.status === "stopped") return false;
    if (Number(distribution.stage) >= 4) return true;
    if (!viewerCountry) return true;
    return !Array.isArray(distribution.countries) || distribution.countries.length === 0 || distribution.countries.includes(viewerCountry);
  });
  const pageRows = visibleRows.slice(0, PAGE_SIZE);
  const posts = await loadFeedPosts(pageRows);
  const lastCandidate = rows?.at(-1);
  const nextCursor = lastCandidate ? { createdAt: lastCandidate.created_at, id: lastCandidate.id } : null;

  return {
    ...chronologicalFeedSchema.parse({ posts, stories: [] }),
    nextCursor,
    hasMore: (rows ?? []).length >= CANDIDATE_BATCH,
  };
}

export async function markPostsSeen(postIds: string[]): Promise<void> {
  if (!postIds.length) return;
  const userId = await currentUserId();
  const uniqueIds = [...new Set(postIds)];
  const { error } = await requireYunikoDb().from("seen_posts").upsert(
    uniqueIds.map(post_id => ({ user_id: userId, post_id, seen_at: new Date().toISOString() })),
    { onConflict: "user_id,post_id" },
  );
  if (error) throw error;
}

export async function getWorldFeed(): Promise<ChronologicalFeed> {
  return (await getFeedPage(null));
}

export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  return getWorldFeed();
}
