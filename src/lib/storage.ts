export type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const noopStorage: StorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export function getLocalStorage(): StorageAdapter {
  if (typeof window === "undefined") return noopStorage;
  try {
    const storage = window.localStorage;
    const probeKey = "__yuniko_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return noopStorage;
  }
}

export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = getLocalStorage().getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStoredJson<T>(key: string, value: T): boolean {
  try {
    getLocalStorage().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string): void {
  try {
    getLocalStorage().removeItem(key);
  } catch {
    // Best effort only. Storage is optional in the frontend-only runtime.
  }
}
