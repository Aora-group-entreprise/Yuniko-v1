import { eventLogSchema, type EventType, type InteractionEvent } from "./event.schema";

const STORAGE_KEY = "yuniko.interaction-events.v1";
const ACTOR_KEY = "yuniko.local-actor.v1";
const VIEWER_COUNTRY_KEY = "yuniko.viewer-country.v1";
const DEFAULT_VIEWER_COUNTRY = "MG";

function actorId(): string {
  if (typeof window === "undefined") return "local-user";
  const existing = window.localStorage.getItem(ACTOR_KEY);
  if (existing) return existing;
  const id = `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(ACTOR_KEY, id);
  return id;
}

function viewerCountry(): string {
  if (typeof window === "undefined") return DEFAULT_VIEWER_COUNTRY;
  const value = window.localStorage.getItem(VIEWER_COUNTRY_KEY)?.trim().toUpperCase();
  return value || DEFAULT_VIEWER_COUNTRY;
}

function readEvents(): InteractionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? eventLogSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : [];
  } catch { return []; }
}

function writeEvents(events: InteractionEvent[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500))); } catch { /* best effort */ }
}

export function recordInteraction(type: EventType, postId: string, targetId?: string, metadata?: Record<string, string>): InteractionEvent {
  const event: InteractionEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    postId,
    actorId: actorId(),
    ...(targetId ? { targetId } : {}),
    createdAt: new Date().toISOString(),
    metadata: { countryCode: viewerCountry(), ...(metadata ?? {}) },
  };
  writeEvents([...readEvents(), event]);
  return event;
}

export function getInteractionEvents(postId?: string): InteractionEvent[] {
  const events = readEvents();
  return postId ? events.filter((event) => event.postId === postId) : events;
}
