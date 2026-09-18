import { requireSupabase, requireYunikoDb } from "../../lib/supabase";\nimport { z } from "zod";

const ENTITY_TYPES = new Set(["post", "comment", "user"]);
const MAX_REASON_LENGTH = 1000;

async function currentUserId(): Promise<string | null> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function getBlockedUserIds(): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await requireYunikoDb().from("blocks").select("blocked_id").eq("blocker_id", userId);
  if (error) throw error;
  return (data ?? []).map(row => row.blocked_id);
}

export async function blockUser(blockedId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Authentication required.");
  if (!blockedId || blockedId === userId) throw new Error("Invalid blocked user.");
  const { error } = await requireYunikoDb().from("blocks").upsert(
    { blocker_id: userId, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" },
  );
  if (error) throw error;
}

export async function unblockUser(blockedId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Authentication required.");
  if (!blockedId) throw new Error("Invalid blocked user.");
  const { error } = await requireYunikoDb().from("blocks").delete()
    .eq("blocker_id", userId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function reportTarget(entityType: string, entityId: string, reason: string) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Authentication required.");
  const normalizedType = entityType.trim().toLowerCase();
  const normalizedReason = reason.trim().slice(0, MAX_REASON_LENGTH);
  if (!ENTITY_TYPES.has(normalizedType) || !normalizedReason) throw new Error("Invalid report.");\n  const normalizedEntityId = z.string().uuid().parse(entityId.trim());
  const { data, error } = await requireYunikoDb().from("reports").insert({
    reporter_id: userId, entity_type: normalizedType, entity_id: normalizedEntityId, reason: normalizedReason,
  }).select("id,reporter_id,entity_type,entity_id,reason,status,created_at").single();
  if (error) throw error;
  return data;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const ids = await getBlockedUserIds();
  return ids.includes(userId);
}
