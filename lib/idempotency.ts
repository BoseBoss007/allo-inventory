import { prisma } from "./prisma";

const TTL = 24 * 60 * 60 * 1000; // 24h

export async function checkIdempotency(key: string) {
  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record) return { cached: false };

  if (record.expiresAt < new Date()) {
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
    return { cached: false };
  }

  return { cached: true, statusCode: record.statusCode, body: record.body };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storeIdempotency(key: string, statusCode: number, body: any) {
  const expiresAt = new Date(Date.now() + TTL);
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: { key, statusCode, body, expiresAt },
    update: { statusCode, body, expiresAt },
  });
}
