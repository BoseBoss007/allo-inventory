/**
 * Core reservation service.
 *
 * Concurrency strategy
 * --------------------
 * We use SELECT FOR UPDATE within a Postgres transaction:
 *   1. Lazy-release expired PENDING reservations for the target inventory row.
 *   2. Lock the inventory row with SELECT FOR UPDATE.
 *   3. Count active PENDING reservations for that row.
 *   4. Compute available = totalUnits - activelyReserved.
 *   5. If available >= quantity → insert reservation; otherwise → raise 409.
 *
 * Because FOR UPDATE holds an exclusive row lock until the transaction
 * commits, a concurrent request for the same inventory row will queue
 * behind us and see the updated count — making it impossible for two
 * requests to over-commit the same physical units.
 *
 * Lazy expiry
 * -----------
 * Expired reservations are released lazily on every read. A cron endpoint
 * (/api/cron/expire-reservations) does the same sweep on a schedule for
 * correctness when traffic is low.
 */

import { prisma } from "./prisma";

const RESERVATION_TTL_MINUTES = parseInt(
  process.env.RESERVATION_TTL_MINUTES ?? "10",
  10
);

/** Release expired PENDING reservations in bulk. Returns count released. */
export async function releaseExpiredReservations(): Promise<number> {
  const result = await prisma.reservation.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  return result.count;
}

/** Create a reservation with race-condition safety via SELECT FOR UPDATE. */
export async function createReservation(
  inventoryId: string,
  quantity: number
): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservation?: any;
  error?: string;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reservation = await (prisma as any).$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        // 1. Lazy-release expired reservations for this inventory row
        await tx.reservation.updateMany({
          where: {
            inventoryId,
            status: "PENDING",
            expiresAt: { lt: new Date() },
          },
          data: {
            status: "RELEASED",
            releasedAt: new Date(),
          },
        });

        // 2. Lock the inventory row exclusively
        const inventoryRows: Array<{ id: string; totalUnits: number }> =
          await tx.$queryRawUnsafe(
            `SELECT id, "totalUnits" FROM inventories WHERE id = $1 FOR UPDATE`,
            inventoryId
          );

        const inventory = inventoryRows[0];

        if (!inventory) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        // 3. Sum all active (PENDING) reservations for this row
        const sumRows: Array<{ sum: string | null }> =
          await tx.$queryRawUnsafe(
            `SELECT COALESCE(SUM(quantity), 0)::text AS sum FROM reservations WHERE "inventoryId" = $1 AND status = 'PENDING'`,
            inventoryId
          );

        const reserved = parseInt(sumRows[0]?.sum ?? "0", 10);
        const available = inventory.totalUnits - reserved;

        if (available < quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        // 4. Create the reservation
        const expiresAt = new Date(
          Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
        );

        return tx.reservation.create({
          data: { inventoryId, quantity, expiresAt },
          include: {
            inventory: {
              include: { product: true, warehouse: true },
            },
          },
        });
      },
      {
        isolationLevel: "ReadCommitted",
        timeout: 10_000,
      }
    );

    return { success: true, reservation };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INSUFFICIENT_STOCK") {
        return { success: false, error: "INSUFFICIENT_STOCK" };
      }
      if (err.message === "INVENTORY_NOT_FOUND") {
        return { success: false, error: "INVENTORY_NOT_FOUND" };
      }
    }
    throw err;
  }
}

/** Confirm a reservation (payment success). Returns 410 if expired. */
export async function confirmReservation(id: string): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservation?: any;
  error?: "NOT_FOUND" | "ALREADY_CONFIRMED" | "ALREADY_RELEASED" | "EXPIRED";
}> {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  if (!existing) return { success: false, error: "NOT_FOUND" };
  if (existing.status === "CONFIRMED")
    return { success: false, error: "ALREADY_CONFIRMED" };
  if (existing.status === "RELEASED")
    return { success: false, error: "ALREADY_RELEASED" };
  if (existing.expiresAt < new Date())
    return { success: false, error: "EXPIRED" };

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  // Permanently decrement stock
  await prisma.inventory.update({
    where: { id: existing.inventoryId },
    data: { totalUnits: { decrement: existing.quantity } },
  });

  return { success: true, reservation: updated };
}

/** Release a reservation early (user cancel / payment failure). */
export async function releaseReservation(id: string): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservation?: any;
  error?: "NOT_FOUND" | "ALREADY_CONFIRMED" | "ALREADY_RELEASED";
}> {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  if (!existing) return { success: false, error: "NOT_FOUND" };
  if (existing.status === "CONFIRMED")
    return { success: false, error: "ALREADY_CONFIRMED" };
  if (existing.status === "RELEASED")
    return { success: false, error: "ALREADY_RELEASED" };

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
    },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  return { success: true, reservation: updated };
}
