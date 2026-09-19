import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { getBlockedUserIds } from "../moderation/moderation.service";

export type SearchResult = {
  profiles: Array<{ id: string; username: string; displayName: string; avatarUrl: string }>;
  posts: Array<{ id: string; authorId: string; caption: string; createdAt: string }>;
};

const MAX_LIMIT = 50;

export async function searchYuniko(query: string, limit = 20): Promise<SearchResult> {
  const q = query.trim().slice(0, 80);
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  if (!q) return { profiles: [], posts: [] };

  const db = requireYunikoDb();
  const blocked = new Set(await getBlockedUserIds());
  const pattern = `%${q}%`;
  const [byUsername, byDisplayName, posts] = await Promise.all([
    db.from("profiles").select("id,username,display_name,avatar_url").ilike("username", pattern).limit(safeLimit),
    db.from("profiles").select("id,username,display_name,avatar_url").ilike("display_name", pattern).limit(safeLimit),
    db.from("posts").select("id,author_id,caption,created_at").eq("status","ready").is("deleted_at",null).ilike("caption", pattern).order("created_at",{ascending:false}).limit(safeLimit),
  ]);
  if (byUsername.error) throw byUsername.error;
  if (byDisplayName.error) throw byDisplayName.error;
  if (posts.error) throw posts.error;

  const profileMap = new Map<string,{id:string;username:string;displayName:string;avatarUrl:string}>();
  for (const row of [...(byUsername.data??[]),...(byDisplayName.data??[])]) {
    if (!blocked.has(row.id) && !profileMap.has(row.id)) profileMap.set(row.id,{id:row.id,username:row.username,displayName:row.display_name,avatarUrl:row.avatar_url??""});
  }

  return {
    profiles:[...profileMap.values()].slice(0,safeLimit),
    posts:(posts.data??[]).filter(row=>!blocked.has(row.author_id)).map(row=>({id:row.id,authorId:row.author_id,caption:row.caption??"",createdAt:row.created_at})),
  };
}
