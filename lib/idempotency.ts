/**
 * Idempotency helper.
 *
 * We store records in Postgres (idempotency_records table).
 * TTL: 24 hours. A client reuses the same Idempotency-Key header to get
 * the cached response without re-running the side effect.
 *
 * For very high traffic, swap the Postgres store for Redis with SETEX.
 */
import { prisma } from "./prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IdempotencyResult {
  cached: boolean;
  statusCode?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

export async function checkIdempotency(
  key: string
): Promise<IdempotencyResult> {
  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record) return { cached: false };
  // treat expired records as non-existent
  if (record.expiresAt < new Date()) {
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
    return { cached: false };
  }
  return { cached: true, statusCode: record.statusCode, body: record.body };
}

export async function storeIdempotency(
  key: string,
  statusCode: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
): Promise<void> {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: { key, statusCode, body, expiresAt },
    update: { statusCode, body, expiresAt },
  });
}
