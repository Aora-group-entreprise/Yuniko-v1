export type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

let clientPromise: Promise<RedisClient | null> | null = null;

export async function getRedis(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL) return null;
  if (clientPromise) return clientPromise;
  clientPromise = import("redis").then(async ({ createClient }) => {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    await client.connect();
    return client as unknown as RedisClient;
  }).catch(() => null);
  return clientPromise;
}
