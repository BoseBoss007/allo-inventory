import { prisma } from "./prisma";

const TTL_MINUTES = parseInt(process.env.RESERVATION_TTL_MINUTES ?? "10", 10);

export async function releaseExpiredReservations() {
  const result = await prisma.reservation.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  return result.count;
}

export async function createReservation(inventoryId: string, quantity: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reservation = await (prisma as any).$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        // clean up any stale holds for this row first
        await tx.reservation.updateMany({
          where: { inventoryId, status: "PENDING", expiresAt: { lt: new Date() } },
          data: { status: "RELEASED", releasedAt: new Date() },
        });

        // exclusive row lock — concurrent requests queue here
        const rows: { id: string; totalUnits: number }[] = await tx.$queryRawUnsafe(
          `SELECT id, "totalUnits" FROM inventories WHERE id = $1 FOR UPDATE`,
          inventoryId
        );

        if (!rows[0]) throw new Error("INVENTORY_NOT_FOUND");

        const sumRows: { sum: string | null }[] = await tx.$queryRawUnsafe(
          `SELECT COALESCE(SUM(quantity), 0)::text AS sum
           FROM reservations
           WHERE "inventoryId" = $1 AND status = 'PENDING'`,
          inventoryId
        );

        const held = parseInt(sumRows[0]?.sum ?? "0", 10);
        const available = rows[0].totalUnits - held;

        if (available < quantity) throw new Error("INSUFFICIENT_STOCK");

        const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

        return tx.reservation.create({
          data: { inventoryId, quantity, expiresAt },
          include: { inventory: { include: { product: true, warehouse: true } } },
        });
      },
      { isolationLevel: "ReadCommitted", timeout: 10_000 }
    );

    return { success: true, reservation };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK")
      return { success: false, error: "INSUFFICIENT_STOCK" as const };
    if (err instanceof Error && err.message === "INVENTORY_NOT_FOUND")
      return { success: false, error: "INVENTORY_NOT_FOUND" as const };
    throw err;
  }
}

export async function confirmReservation(id: string) {
  const res = await prisma.reservation.findUnique({
    where: { id },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  if (!res) return { success: false, error: "NOT_FOUND" as const };
  if (res.status === "CONFIRMED") return { success: false, error: "ALREADY_CONFIRMED" as const };
  if (res.status === "RELEASED") return { success: false, error: "ALREADY_RELEASED" as const };
  if (res.expiresAt < new Date()) return { success: false, error: "EXPIRED" as const };

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  // permanently decrement stock on confirm
  await prisma.inventory.update({
    where: { id: res.inventoryId },
    data: { totalUnits: { decrement: res.quantity } },
  });

  return { success: true, reservation: updated };
}

export async function releaseReservation(id: string) {
  const res = await prisma.reservation.findUnique({
    where: { id },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  if (!res) return { success: false, error: "NOT_FOUND" as const };
  if (res.status === "CONFIRMED") return { success: false, error: "ALREADY_CONFIRMED" as const };
  if (res.status === "RELEASED") return { success: false, error: "ALREADY_RELEASED" as const };

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "RELEASED", releasedAt: new Date() },
    include: { inventory: { include: { product: true, warehouse: true } } },
  });

  return { success: true, reservation: updated };
}
