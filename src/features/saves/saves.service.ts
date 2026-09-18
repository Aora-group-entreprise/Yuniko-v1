import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { z } from "zod";
import type { Collection, SavedPost, SavesState } from "./save.schema";

const collectionNameSchema = z.string().trim().min(1).max(80);
const postIdSchema = z.string().uuid();

type SaveRow = { user_id: string; post_id: string; created_at: string; collection_id: string | null };
type CollectionRow = { id: string; user_id: string; name: string; created_at: string };

function toCollection(row: CollectionRow): Collection {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

export async function listSaves(): Promise<SavesState> {
  const db = requireYunikoDb();
  const userId = await currentUserId();
  const [{ data: saves, error: savesError }, { data: collections, error: collectionsError }] = await Promise.all([
    db.from("saves").select("user_id,post_id,created_at,collection_id").eq("user_id", userId),
    db.from("collections").select("id,user_id,name,created_at").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (savesError) throw savesError;
  if (collectionsError) throw collectionsError;

  const savedPosts = (saves as SaveRow[]).reduce<SavedPost[]>((result, row) => {
    const existing = result.find((item) => item.postId === row.post_id);
    if (existing) {
      if (row.collection_id && !existing.collectionIds.includes(row.collection_id)) existing.collectionIds.push(row.collection_id);
    } else {
      result.push({ postId: row.post_id, collectionIds: row.collection_id ? [row.collection_id] : [], savedAt: row.created_at });
    }
    return result;
  }, []);

  return { savedPosts, collections: (collections as CollectionRow[]).map(toCollection) };
}

export async function isPostSaved(postId: string): Promise<boolean> {
  postIdSchema.parse(postId);
  const userId = await currentUserId();
  const { data, error } = await requireYunikoDb().from("saves").select("post_id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function getDefaultCollectionId(userId: string): Promise<string> {
  const db = requireYunikoDb();
  const { data, error } = await db.from("collections").select("id").eq("user_id", userId).eq("name", "Enregistrements").maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id;

  const { data: created, error: createError } = await db.from("collections").insert({ user_id: userId, name: "Enregistrements" }).select("id").single();
  if (createError) throw createError;
  return created.id;
}

export async function savePost(postId: string, collectionId?: string): Promise<void> {
  postIdSchema.parse(postId);
  if (collectionId) z.string().uuid().parse(collectionId);
  const userId = await currentUserId();
  const targetCollectionId = collectionId ?? await getDefaultCollectionId(userId);
  const db = requireYunikoDb();
  const { data: existing, error: existingError } = await db.from("saves").select("user_id,post_id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    const { error } = await db.from("saves").insert({ user_id: userId, post_id: postId, collection_id: targetCollectionId });
    if (error) throw error;
    await db.from("events").insert({ user_id: userId, post_id: postId, type: "save.created", weight: 1 });
    return;
  }

  const { error } = await db.from("saves").update({ collection_id: targetCollectionId }).eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export async function unsavePost(postId: string): Promise<void> {
  postIdSchema.parse(postId);
  const userId = await currentUserId();
  const { error } = await requireYunikoDb().from("saves").delete().eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export async function createCollection(name: string): Promise<Collection> {
  const userId = await currentUserId();
  const parsed = collectionNameSchema.parse(name);
  const { data, error } = await requireYunikoDb().from("collections").insert({ user_id: userId, name: parsed }).select("id,user_id,name,created_at").single();
  if (error) throw error;
  return toCollection(data as CollectionRow);
}

export async function togglePostInCollection(postId: string, collectionId: string): Promise<void> {
  postIdSchema.parse(postId);
  z.string().uuid().parse(collectionId);
  const userId = await currentUserId();
  const db = requireYunikoDb();
  const { data: saved, error: readError } = await db.from("saves").select("user_id,post_id,collection_id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (readError) throw readError;

  if (!saved) {
    await savePost(postId, collectionId);
    return;
  }

  if (saved.collection_id === collectionId) {
    const { data: other } = await db.from("collections").select("id").eq("user_id", userId).neq("id", collectionId).limit(1).maybeSingle();
    const { error } = await db.from("saves").update({ collection_id: other?.id ?? null }).eq("user_id", userId).eq("post_id", postId);
    if (error) throw error;
  } else {
    const { error } = await db.from("saves").update({ collection_id: collectionId }).eq("user_id", userId).eq("post_id", postId);
    if (error) throw error;
  }
}

export async function getSavesState(): Promise<SavesState> {
  return listSaves();
}
