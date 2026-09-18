import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getConversationMessages, getConversations, markConversationRead, sendMessage, subscribeToConversation } from "./messages.service";
import type { Conversation, Message } from "./messages.service";

type MessagesPageProps = { onBack: () => void };

export function MessagesPage({ onBack }: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => { void getConversations().then(setConversations).catch(() => setConversations([])); };
  useEffect(() => { refresh(); }, []);

  const selected = conversations.find(conversation => conversation.id === selectedId) ?? null;
  if (selected) return <ConversationView conversation={selected} onBack={() => { setSelectedId(null); refresh(); }} />;

  return <main className="messages-page">
    <header className="messages-header">
      <button type="button" className="messages-back" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
      <div><h1>Messages</h1><p>Private conversations</p></div>
    </header>
    <section className="messages-list" aria-label="Conversations">
      {conversations.map(conversation => (
        <button key={conversation.id} type="button" className="conversation-item" onClick={() => {
          void markConversationRead(conversation.id, null);
          setSelectedId(conversation.id);
        }}>
          <img src={conversation.participantAvatarUrl} alt="" />
          <span className="conversation-copy"><strong>{conversation.participantName}</strong><small>@{conversation.participantUsername}</small><span>{conversation.lastMessagePreview}</span></span>
          {conversation.unreadCount > 0 && <b className="unread-count">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b>}
        </button>
      ))}
      {!conversations.length && <div className="feed-state">No conversations yet.</div>}
    </section>
  </main>;
}

function ConversationView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = () => { void getConversationMessages(conversation.id).then(setMessages).catch(() => setMessages([])); };
  useEffect(() => {
    refresh();
    return subscribeToConversation(conversation.id, refresh);
  }, [conversation.id]);
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null;
    if (lastId) void markConversationRead(conversation.id, lastId);
  }, [conversation.id, messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const submit = async () => {
    const message = await sendMessage(conversation.id, draft);
    if (!message) return;
    setDraft("");
    setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
  };

  return <main className="messages-page conversation-page">
    <header className="conversation-header">
      <button type="button" className="messages-back" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
      <img src={conversation.participantAvatarUrl} alt="" />
      <div><strong>{conversation.participantName}</strong><small>@{conversation.participantUsername}</small></div>
    </header>
    <section className="message-thread" aria-label={`Conversation with ${conversation.participantName}`}>
      {messages.map(message => <div key={message.id} className="message-row incoming"><div className="message-bubble">{message.body}</div></div>)}
      <div ref={endRef} />
    </section>
    <form className="message-composer" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <textarea value={draft} maxLength={4000} rows={1} placeholder="Write a message..." aria-label="Message" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
      }} />
      <button type="submit" aria-label="Send message" disabled={!draft.trim()}><Send size={19} /></button>
    </form>
  </main>;
}
