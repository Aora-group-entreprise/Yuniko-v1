export type AppLanguage = "system" | "fr" | "en" | "mg";
export type Appearance = "system" | "light" | "dark";

export type YunikoSettings = {
  language: AppLanguage;
  appearance: Appearance;
  pushNotifications: boolean;
  messageNotifications: boolean;
  emailNotifications: boolean;
  privateAccount: boolean;
  showActivityStatus: boolean;
};

const KEY = "yuniko.settings.v1";
const CHANGE_EVENT = "yuniko:settings-changed";

const DEFAULTS: YunikoSettings = {
  language: "system",
  appearance: "system",
  pushNotifications: true,
  messageNotifications: true,
  emailNotifications: false,
  privateAccount: false,
  showActivityStatus: true,
};

function read(): YunikoSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<YunikoSettings> | null;
    return { ...DEFAULTS, ...(parsed ?? {}) };
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

export function updateSettings(patch: Partial<YunikoSettings>): YunikoSettings {
  return write({ ...read(), ...patch });
}

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
