import { messageLogSchema, conversationListSchema, type Conversation, type Message } from "./message.schema";
import { getBlockedUserIds } from "../moderation/moderation.service";

const MESSAGE_KEY = "yuniko.messages.v1";
const ACTOR_KEY = "yuniko.local-actor.v1";
const CHANGE_EVENT = "yuniko:messages-changed";

const DEMO_PEOPLE = [
  { id: "2", name: "Sofia Park", username: "sofia.park", avatarUrl: "https://i.pravatar.cc/160?img=47" },
  { id: "3", name: "Noah Reyes", username: "noah.reyes", avatarUrl: "https://i.pravatar.cc/160?img=12" },
];

function actorId(): string {
  if (typeof window === "undefined") return "1";
  try {
    const stored = window.localStorage.getItem(ACTOR_KEY);
    if (stored) return stored;
    window.localStorage.setItem(ACTOR_KEY, "1");
  } catch {
    // Best effort only.
  }
  return "1";
}

function readMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MESSAGE_KEY) ?? "[]");
    const result = messageLogSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function writeMessages(messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MESSAGE_KEY, JSON.stringify(messages.slice(-500)));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Best effort only.
  }
}

function conversationIdFor(participantId: string): string {
  return `dm-${[actorId(), participantId].sort().join("-")}`;
}

function seedIfNeeded(): Message[] {
  const existing = readMessages();
  if (existing.length > 0 || typeof window === "undefined") return existing;

  const now = new Date().toISOString();
  const seed: Message[] = [
    {
      id: "demo-msg-1",
      conversationId: conversationIdFor("2"),
      senderId: "2",
      recipientId: actorId(),
      body: "Bienvenue sur Yuniko 👋",
      createdAt: now,
      readAt: null,
    },
  ];
  writeMessages(seed);
  return seed;
}

function blockedIds(): Set<string> {
  return new Set(getBlockedUserIds());
}

export function getConversations(): Conversation[] {
  const messages = seedIfNeeded();
  const currentActor = actorId();
  const blocked = blockedIds();
  const byParticipant = new Map<string, Message[]>();

  for (const message of messages) {
    if (message.senderId !== currentActor && message.recipientId !== currentActor) continue;
    const participantId = message.senderId === currentActor ? message.recipientId : message.senderId;
    if (blocked.has(participantId)) continue;
    const list = byParticipant.get(participantId) ?? [];
    list.push(message);
    byParticipant.set(participantId, list);
  }

  for (const person of DEMO_PEOPLE) {
    if (!blocked.has(person.id) && !byParticipant.has(person.id)) byParticipant.set(person.id, []);
  }

  const conversations = [...byParticipant.entries()].map(([participantId, list]) => {
    const person = DEMO_PEOPLE.find((item) => item.id === participantId) ?? {
      id: participantId,
      name: "Yuniko user",
      username: `user-${participantId}`,
      avatarUrl: "https://i.pravatar.cc/160?img=1",
    };
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = sorted.at(-1);
    const unreadCount = sorted.filter((message) => message.recipientId === currentActor && !message.readAt).length;

    return {
      id: conversationIdFor(participantId),
      participantId,
      participantName: person.name,
      participantUsername: person.username,
      participantAvatarUrl: person.avatarUrl,
      updatedAt: last?.createdAt ?? new Date(0).toISOString(),
      lastMessagePreview: last?.body ?? "Start a conversation",
      unreadCount,
    } satisfies Conversation;
  });

  const parsed = conversationListSchema.safeParse(conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  return parsed.success ? parsed.data : [];
}

export function getConversationMessages(conversationId: string): Message[] {
  const blocked = blockedIds();
  const actor = actorId();
  return readMessages()
    .filter((message) => message.conversationId === conversationId)
    .filter((message) => !blocked.has(message.senderId === actor ? message.recipientId : message.senderId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function sendMessage(conversationId: string, recipientId: string, body: string): Message | null {
  const normalized = body.trim().slice(0, 4000);
  if (!normalized || getBlockedUserIds().includes(recipientId)) return null;

  const message: Message = {
    id: `msg-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    conversationId,
    senderId: actorId(),
    recipientId,
    body: normalized,
    createdAt: new Date().toISOString(),
    readAt: new Date().toISOString(),
  };
  writeMessages([...readMessages(), message]);
  return message;
}

export function markConversationRead(conversationId: string): void {
  const currentActor = actorId();
  const now = new Date().toISOString();
  let changed = false;
  const updated = readMessages().map((message) => {
    if (message.conversationId !== conversationId || message.recipientId !== currentActor || message.readAt) return message;
    changed = true;
    return { ...message, readAt: now };
  });
  if (changed) writeMessages(updated);
}

export function subscribeToMessageChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
