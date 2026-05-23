import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET() {
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

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    sku: p.sku,
    warehouses: p.inventories.map((inv) => {
      const held = inv.reservations.reduce(
        (sum: number, r: { quantity: number }) => sum + r.quantity,
        0
      );
      return {
        inventoryId: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalUnits: inv.totalUnits,
        reservedUnits: held,
        availableUnits: inv.totalUnits - held,
      };
    }),
  }));

  return NextResponse.json(data);
}
