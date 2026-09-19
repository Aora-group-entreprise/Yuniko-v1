type Entry<T> = { value: T; expiresAt: number };
const memory = new Map<string, Entry<unknown>>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) { memory.delete(key); return null; }
  return hit.value as T;
}
export async function cacheSet<T>(key: string, value: T, ttlMs = 30_000): Promise<void> {
  memory.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}
export async function cacheDelete(key: string): Promise<void> { memory.delete(key); }
export async function cacheGetOrSet<T>(key: string, loader: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(key, value, ttlMs);
  return value;
}
