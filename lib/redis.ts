import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export async function acquireLock(key: string, ttlSeconds = 10): Promise<string | null> {
  const token = crypto.randomUUID();
  const ok = await redis.set(`lock:${key}`, token, { nx: true, ex: ttlSeconds });
  return ok === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  // only release if we still own it
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, [`lock:${key}`], [token]);
}
