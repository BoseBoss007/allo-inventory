import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET() {
  // Lazy-release expired reservations first
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: {
          warehouse: true,
          reservations: {
            where: { status: "PENDING" },
            select: { quantity: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const enriched = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    sku: product.sku,
    warehouses: product.inventories.map((inv) => {
      const reserved = inv.reservations.reduce(
        (s: number, r: { quantity: number }) => s + r.quantity,
        0
      );
      return {
        inventoryId: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalUnits: inv.totalUnits,
        reservedUnits: reserved,
        availableUnits: inv.totalUnits - reserved,
      };
    }),
  }));

  return NextResponse.json(enriched);
}
