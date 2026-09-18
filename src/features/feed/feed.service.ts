import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { chronologicalFeedSchema, type ChronologicalFeed, type FeedPost } from "./feed.schema";
import { getBlockedUserIds } from "../moderation/moderation.service";

export type FeedCursor = { createdAt: string; id: string } | null;
export type FeedPage = ChronologicalFeed & { nextCursor: FeedCursor; hasMore: boolean };

const PAGE_SIZE = 20;
const CANDIDATE_BATCH = 80;
const SEEN_WINDOW_DAYS = 7;

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
      hashtags: [],
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
  const seenCutoff = new Date(Date.now() - SEEN_WINDOW_DAYS * 86_400_000).toISOString();

  const { data: seenRows, error: seenError } = await db.from("seen_posts")
    .select("post_id").eq("user_id", userId).gte("seen_at", seenCutoff);
  if (seenError) throw seenError;
  const seenIds = (seenRows ?? []).map(row => row.post_id);

  let query = db.from("posts")
    .select("id,author_id,caption,created_at,like_count,comment_count,save_count,share_count,view_count")
    .eq("status","ready").is("deleted_at",null)
    .order("created_at",{ascending:false}).order("id",{ascending:false})
    .limit(CANDIDATE_BATCH);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  if (seenIds.length) query = query.not("id","in",`(${seenIds.join(",")})`);

  const { data: rows, error } = await query;
  if (error) throw error;

  const visibleRows = (rows ?? []).filter(row => !blocked.has(row.author_id));
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
