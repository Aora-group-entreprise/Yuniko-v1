import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

export type ConversationSummary = {
  id: string; participantId: string; participantName: string; participantUsername: string;
  participantAvatarUrl: string; updatedAt: string; lastMessagePreview: string; unreadCount: number;
};
export type Message = {
  id: string; conversationId: string; senderId: string; body: string;
  mediaUrl: string | null; replyToId: string | null; createdAt: string;
};

async function uid(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const userId = await uid();
  const db = requireYunikoDb();
  const { data: members, error } = await db.from("conversation_members")
    .select("conversation_id,last_read_message_id").eq("user_id", userId).eq("is_archived", false);
  if (error) throw error;
  if (!members?.length) return [];

  const ids = members.map(member => member.conversation_id);
  const { data: convos, error: conversationError } = await db.from("conversations")
    .select("id,created_at,last_message_at").in("id", ids)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (conversationError) throw conversationError;

  const result: ConversationSummary[] = [];
  for (const conversation of convos ?? []) {
    const member = members.find(item => item.conversation_id === conversation.id);
    const { data: other, error: otherError } = await db.from("conversation_members")
      .select("user_id").eq("conversation_id", conversation.id).neq("user_id", userId).limit(1).maybeSingle();
    if (otherError) throw otherError;
    if (!other) continue;

    const { data: profile, error: profileError } = await db.from("profiles")
      .select("id,display_name,username,avatar_url").eq("id", other.user_id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) continue;

    const { data: last, error: lastError } = await db.from("messages")
      .select("id,body,created_at").eq("conversation_id", conversation.id).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw lastError;

    let unreadCount = 0;
    if (last?.id && member?.last_read_message_id !== last.id) {
      const marker = member?.last_read_message_id
        ? await db.from("messages").select("created_at").eq("id", member.last_read_message_id).maybeSingle()
        : { data: null, error: null };
      if (marker.error) throw marker.error;
      let unreadQuery = db.from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id).is("deleted_at", null)
        .neq("sender_id", userId);
      if (marker.data?.created_at) unreadQuery = unreadQuery.gt("created_at", marker.data.created_at);
      const { count, error: unreadError } = await unreadQuery;
      if (unreadError) throw unreadError;
      unreadCount = count ?? 0;
    }

    result.push({
      id: conversation.id,
      participantId: profile.id,
      participantName: profile.display_name,
      participantUsername: profile.username,
      participantAvatarUrl: profile.avatar_url ?? "",
      updatedAt: last?.created_at ?? conversation.last_message_at ?? conversation.created_at,
      lastMessagePreview: last?.body ?? "",
      unreadCount,
    });
  }
  return result;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const userId = await uid();
  const db = requireYunikoDb();
  const { data: member, error: memberError } = await db.from("conversation_members")
    .select("conversation_id").eq("conversation_id", conversationId).eq("user_id", userId).maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error("Conversation access denied.");

  const { data, error } = await db.from("messages")
    .select("id,conversation_id,sender_id,body,media_url,reply_to_id,created_at")
    .eq("conversation_id", conversationId).is("deleted_at", null).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(message => ({
    id: message.id, conversationId: message.conversation_id, senderId: message.sender_id,
    body: message.body ?? "", mediaUrl: message.media_url, replyToId: message.reply_to_id, createdAt: message.created_at,
  }));
}

export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  const text = body.trim().slice(0, 4000);
  if (!text) return null;
  const { data, error } = await requireSupabase().schema("yunikov_v1").rpc("send_message_atomic", {
    p_conversation_id: conversationId,
    p_body: text,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body ?? "",
    mediaUrl: row.media_url ?? null,
    replyToId: row.reply_to_id ?? null,
    createdAt: row.created_at,
  };
}

export async function markConversationRead(conversationId: string, messageId: string | null): Promise<void> {
  const userId = await uid();
  const { error } = await requireYunikoDb().from("conversation_members")
    .update({ last_read_message_id: messageId })
    .eq("conversation_id", conversationId).eq("user_id", userId);
  if (error) throw error;
}

export function subscribeToConversation(conversationId: string, listener: () => void): () => void {
  const client = requireSupabase();
  const channel = client.channel("conversation:" + conversationId)
    .on("postgres_changes", {
      event: "*", schema: "yunikov_v1", table: "messages", filter: "conversation_id=eq." + conversationId,
    }, listener);
  void channel.subscribe();
  return () => { void client.removeChannel(channel); };
}
