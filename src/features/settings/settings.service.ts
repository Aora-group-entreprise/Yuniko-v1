export type AppLanguage = "system" | "fr" | "en" | "mg";
export type Appearance = "system" | "light" | "dark";
export type MessagePrivacy = "everyone" | "followers" | "nobody";
export type StoryPrivacy = "everyone" | "followers" | "close_friends";
export type CommentPrivacy = "everyone" | "followers" | "nobody";

export type YunikoSettings = {
  language: AppLanguage;
  appearance: Appearance;
  pushNotifications: boolean;
  messageNotifications: boolean;
  emailNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  followerNotifications: boolean;
  storyNotifications: boolean;
  privateAccount: boolean;
  showActivityStatus: boolean;
  messagePrivacy: MessagePrivacy;
  storyPrivacy: StoryPrivacy;
  commentPrivacy: CommentPrivacy;
};

const KEY = "yuniko.settings.v2";
const LEGACY_KEY = "yuniko.settings.v1";
const CHANGE_EVENT = "yuniko:settings-changed";

const DEFAULTS: YunikoSettings = {
  language: "system",
  appearance: "system",
  pushNotifications: true,
  messageNotifications: true,
  emailNotifications: false,
  likeNotifications: true,
  commentNotifications: true,
  followerNotifications: true,
  storyNotifications: true,
  privateAccount: false,
  showActivityStatus: true,
  messagePrivacy: "everyone",
  storyPrivacy: "everyone",
  commentPrivacy: "everyone",
};

function read(): YunikoSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const current = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<YunikoSettings> | null;
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "null") as Partial<YunikoSettings> | null;
    return { ...DEFAULTS, ...(legacy ?? {}), ...(current ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

function write(settings: YunikoSettings): YunikoSettings {
  window.localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  return settings;
}

export function getSettings(): YunikoSettings { return read(); }
export function updateSettings(patch: Partial<YunikoSettings>): YunikoSettings { return write({ ...read(), ...patch }); }
export function resetSettings(): YunikoSettings { return write({ ...DEFAULTS }); }
export function subscribeToSettings(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
