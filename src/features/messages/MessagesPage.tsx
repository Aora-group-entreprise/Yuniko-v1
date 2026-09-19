import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "../../lib/supabase";
import { getConversationMessages, getConversations, markConversationRead, sendMessage, subscribeToConversation } from "./messages.service";
import type { ConversationSummary, Message } from "./messages.service";

type MessagesPageProps = { onBack: () => void };

const conversationsKey = ["messages", "conversations"] as const;
const messagesKey = (id: string) => ["messages", "conversation", id] as const;

export function MessagesPage({ onBack }: MessagesPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: conversationsKey, queryFn: getConversations, staleTime: 10_000 });

  const selected = query.data?.find((conversation) => conversation.id === selectedId) ?? null;
  if (selected) {
    return <ConversationView conversation={selected} onBack={() => {
      setSelectedId(null);
      void query.refetch();
    }} />;
  }

  return <main className="messages-page yunikov1-page">
    <header className="messages-header">
      <button type="button" className="messages-back" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
      <div><h1>Messages</h1><p>Private conversations</p></div>
    </header>
    <section className="messages-list yunikov1-list" aria-label="Conversations">
      {query.isLoading ? <div className="feed-state">Loading messages…</div> : query.data?.map((conversation) => (
        <button key={conversation.id} type="button" className="conversation-item" onClick={() => setSelectedId(conversation.id)}>
          <img src={conversation.participantAvatarUrl} alt="" />
          <span className="conversation-copy"><strong>{conversation.participantName}</strong><small>@{conversation.participantUsername}</small><span>{conversation.lastMessagePreview}</span></span>
          {conversation.unreadCount > 0 && <b className="unread-count">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b>}
        </button>
      ))}
      {!query.isLoading && !query.data?.length && <div className="feed-state">No conversations yet.</div>}
    </section>
  </main>;
}

function ConversationView({ conversation, onBack }: { conversation: ConversationSummary; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const key = messagesKey(conversation.id);
  const query = useQuery({ queryKey: key, queryFn: () => getConversationMessages(conversation.id), staleTime: 5_000 });
  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(conversation.id, body),
    onSuccess: (message) => {
      if (!message) return;
      queryClient.setQueryData<Message[]>(key, (current = []) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      void queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });

  useEffect(() => {
    let active = true;
    void requireSupabase().auth.getUser().then(({ data }) => { if (active) setCurrentUserId(data.user?.id ?? null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: conversationsKey });
    };
    return subscribeToConversation(conversation.id, refresh);
  }, [conversation.id, key, queryClient]);

  const messages = query.data ?? [];

  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null;
    if (lastId) void markConversationRead(conversation.id, lastId).then(() => {
      void queryClient.invalidateQueries({ queryKey: conversationsKey });
    }).catch(() => undefined);
  }, [conversation.id, messages, queryClient]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const submit = async () => {
    const value = draft.trim();
    if (!value || sendMutation.isPending) return;
    await sendMutation.mutateAsync(value);
    setDraft("");
  };

  return <main className="messages-page conversation-page yunikov1-page">
    <header className="conversation-header">
      <button type="button" className="messages-back" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
      <img src={conversation.participantAvatarUrl} alt="" />
      <div><strong>{conversation.participantName}</strong><small>@{conversation.participantUsername}</small></div>
    </header>
    <section className="message-thread" aria-label={`Conversation with ${conversation.participantName}`}>
      {query.isLoading ? <div className="feed-state">Loading…</div> : messages.map((message) => (
        <div key={message.id} className={`message-row ${message.senderId === currentUserId ? "outgoing" : "incoming"}`}>
          <div className="message-bubble">{message.body}</div>
        </div>
      ))}
      <div ref={endRef} />
    </section>
    <form className="message-composer" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <textarea value={draft} maxLength={4000} rows={1} placeholder="Write a message..." aria-label="Message"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
        }} />
      <button type="submit" aria-label="Send message" disabled={!draft.trim() || sendMutation.isPending}><Send size={19} /></button>
    </form>
  </main>;
}
