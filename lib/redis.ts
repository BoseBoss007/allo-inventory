import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Distributed lock helper using SET NX EX
export async function acquireLock(
  key: string,
  ttlSeconds: number = 10
): Promise<string | null> {
  const lockValue = crypto.randomUUID();
  const result = await redis.set(`lock:${key}`, lockValue, {
    nx: true,
    ex: ttlSeconds,
  });
  return result === "OK" ? lockValue : null;
}

export async function releaseLock(
  key: string,
  lockValue: string
): Promise<void> {
  // Lua script to ensure atomicity: only release if we own the lock
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, [`lock:${key}`], [lockValue]);
}
