import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { notificationSchema, type Notification, type NotificationType } from "./notification.schema";

type NotificationRow = {
  id: string; recipient_id: string; actor_id: string | null; type: string;
  entity_type: string | null; entity_id: string | null; count: number;
  is_read: boolean; created_at: string;
};
type ActorRow = { id: string; username: string; display_name: string; avatar_url: string | null };

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

export async function getNotifications(): Promise<Notification[]> {
  const userId = await currentUserId();
  const db = requireYunikoDb();
  const { data: rows, error } = await db.from("notifications")
    .select("id,recipient_id,actor_id,type,entity_type,entity_id,count,is_read,created_at")
    .eq("recipient_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  const actorIds = [...new Set((rows as NotificationRow[]).map(r => r.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors, error: actorError } = actorIds.length
    ? await db.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds)
    : { data: [], error: null };
  if (actorError) throw actorError;
  const map = new Map((actors as ActorRow[]).map(a => [a.id, a]));
  return (rows as NotificationRow[]).map(row => {
    const actor = row.actor_id ? map.get(row.actor_id) : undefined;
    return notificationSchema.parse({
      id: row.id,
      type: row.type,
      actorId: row.actor_id ?? "",
      actorName: actor?.display_name ?? "Yuniko",
      actorUsername: actor?.username ?? "yuniko",
      actorAvatarUrl: actor?.avatar_url ?? "",
      postId: row.entity_type === "post" ? row.entity_id ?? undefined : undefined,
      conversationId: row.entity_type === "conversation" ? row.entity_id ?? undefined : undefined,
      count: row.count,
      message: ({like:"a aimé votre publication.",comment:"a commenté votre publication.",reply:"a répondu à votre commentaire.",save:"a enregistré votre publication.",share:"a partagé votre publication.",follow:"a commencé à vous suivre.",follow_request:"vous a envoyé une demande.",message:"vous a envoyé un message."} as Record<string,string>)[row.type] ?? "a interagi avec vous.",
      createdAt: row.created_at,
      read: row.is_read,
    });
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await currentUserId();
  const { count, error } = await requireYunikoDb().from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await requireYunikoDb().from("notifications").update({ is_read: true }).eq("id", id).eq("recipient_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await currentUserId();
  const { error } = await requireYunikoDb().from("notifications").update({ is_read: true }).eq("recipient_id", userId).eq("is_read", false);
  if (error) throw error;
}

export function notificationTypeLabel(type: NotificationType): string {
  return ({like:"J’aime",comment:"Commentaire",reply:"Réponse",save:"Enregistrement",share:"Partage",follow:"Abonnement",follow_request:"Demande",message:"Message"} as Record<NotificationType,string>)[type];
}

export function subscribeToNotifications(listener: () => void): () => void {
  const client = requireSupabase();
  let active = true;
  let channel: ReturnType<typeof client.channel> | null = null;

  void currentUserId().then((userId) => {
    if (!active) return;
    channel = client.channel("user:notifications:" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "yunikov_v1",
        table: "notifications",
        filter: "recipient_id=eq." + userId,
      }, () => listener());
    void channel.subscribe();
  }).catch(() => undefined);

  return () => {
    active = false;
    if (channel) void client.removeChannel(channel);
  };
}
