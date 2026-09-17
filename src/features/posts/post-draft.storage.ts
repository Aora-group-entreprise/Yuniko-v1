import type { PostDraft } from "./post.schema";

const DB_NAME = "yuniko-post-drafts";
const STORE_NAME = "draft";
const RECORD_KEY = "current";

interface DraftRecord {
  key: string;
  draft: PostDraft;
  files: File[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open draft storage"));
  });
}

export async function savePostDraft(draft: PostDraft, files: File[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key: RECORD_KEY, draft, files } satisfies DraftRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to save draft"));
  });
  db.close();
}

export async function loadPostDraft(): Promise<{ draft: PostDraft; files: File[] } | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const result = await new Promise<DraftRecord | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve(request.result as DraftRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to load draft"));
  });
  db.close();
  return result ? { draft: result.draft, files: result.files } : null;
}

export async function clearPostDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to clear draft"));
  });
  db.close();
}
