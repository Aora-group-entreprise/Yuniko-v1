import { loginEventLogSchema, securityStateSchema, sessionLogSchema, type LoginEvent, type SecurityState, type Session } from "./security.schema";

export type { LoginEvent, SecurityState, Session } from "./security.schema";

const SESSIONS_KEY = "yuniko.security.sessions.v1";
const LOGIN_EVENTS_KEY = "yuniko.security.login-events.v1";
const STATE_KEY = "yuniko.security.state.v1";
const ACTOR_KEY = "yuniko.local-actor.v1";
const ACTOR_FALLBACK = "1";
const DEFAULT_COUNTRY = "MG";

function actorId(): string {
  if (typeof window === "undefined") return ACTOR_FALLBACK;
  return window.localStorage.getItem(ACTOR_KEY)?.trim() || ACTOR_FALLBACK;
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function readSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try { return sessionLogSchema.parse(JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]")); } catch { return []; }
}

function writeSessions(sessions: Session[]) {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionLogSchema.parse(sessions).slice(-20)));
  window.dispatchEvent(new CustomEvent("yuniko:security-changed"));
}

function readEvents(): LoginEvent[] {
  if (typeof window === "undefined") return [];
  try { return loginEventLogSchema.parse(JSON.parse(window.localStorage.getItem(LOGIN_EVENTS_KEY) ?? "[]")); } catch { return []; }
}

function writeEvents(events: LoginEvent[]) {
  window.localStorage.setItem(LOGIN_EVENTS_KEY, JSON.stringify(loginEventLogSchema.parse(events).slice(-100)));
}

function readState(): SecurityState {
  if (typeof window === "undefined") return { userId: ACTOR_FALLBACK, twoFactorEnabled: false, recoveryCodes: [] };
  try {
    return securityStateSchema.parse(JSON.parse(window.localStorage.getItem(STATE_KEY) ?? "{}"));
  } catch {
    return { userId: actorId(), twoFactorEnabled: false, recoveryCodes: [] };
  }
}

function writeState(state: SecurityState) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify(securityStateSchema.parse(state)));
  window.dispatchEvent(new CustomEvent("yuniko:security-changed"));
}

function randomCode(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function getSecurityState(): SecurityState {
  const state = readState();
  if (state.userId === actorId()) return state;
  const next = { userId: actorId(), twoFactorEnabled: false, recoveryCodes: [] };
  if (typeof window !== "undefined") writeState(next);
  return next;
}

export function enableTwoFactor(): SecurityState {
  const current = getSecurityState();
  const next = { ...current, twoFactorEnabled: true, recoveryCodes: Array.from({ length: 8 }, () => randomCode()) };
  writeState(next);
  return next;
}

export function disableTwoFactor(): SecurityState {
  const next = { ...getSecurityState(), twoFactorEnabled: false, recoveryCodes: [] };
  writeState(next);
  return next;
}

export function regenerateRecoveryCodes(): string[] {
  const current = getSecurityState();
  const codes = Array.from({ length: 8 }, () => randomCode());
  writeState({ ...current, recoveryCodes: codes });
  return codes;
}

export function getRecoveryCodes(): string[] {
  return getSecurityState().recoveryCodes;
}

export function getSessions(): Session[] {
  return readSessions().filter((session) => session.userId === actorId());
}

export function registerCurrentSession(deviceLabel = "This device"): Session {
  const now = new Date().toISOString();
  const sessions = getSessions();
  const current = sessions.find((session) => session.current);
  if (current) {
    const updated = sessions.map((session) => session.id === current.id ? { ...session, deviceLabel, lastSeenAt: now, current: true } : { ...session, current: false });
    writeSessions(updated);
    return updated.find((session) => session.id === current.id)!;
  }
  const session = { id: id("session"), userId: actorId(), deviceLabel, createdAt: now, lastSeenAt: now, current: true };
  writeSessions([...sessions.map((item) => ({ ...item, current: false })), session]);
  return session;
}

export function revokeSession(sessionId: string): void {
  const sessions = getSessions();
  if (sessions.find((session) => session.id === sessionId)?.current) return;
  writeSessions(sessions.filter((session) => session.id !== sessionId));
}

export function getLoginEvents(): LoginEvent[] {
  return readEvents().filter((event) => event.userId === actorId());
}

export function recordLoginEvent(success: boolean, deviceLabel = "This device", countryCode = DEFAULT_COUNTRY): LoginEvent {
  const event = { id: id("login"), userId: actorId(), createdAt: new Date().toISOString(), deviceLabel, countryCode: countryCode.toUpperCase(), success };
  const parsed = loginEventLogSchema.element.parse(event);
  writeEvents([...readEvents(), parsed]);
  if (success) registerCurrentSession(deviceLabel);
  return parsed;
}

export function subscribeToSecurityChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener("yuniko:security-changed", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("yuniko:security-changed", onChange);
    window.removeEventListener("storage", onChange);
  };
}
