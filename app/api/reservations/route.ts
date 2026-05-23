import { NextRequest, NextResponse } from "next/server";
import { ReserveSchema } from "@/lib/schemas";
import { createReservation } from "@/lib/reservations";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");

    // Idempotency check
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached.cached) {
        return NextResponse.json(cached.body, {
          status: cached.statusCode,
          headers: { "X-Idempotent-Replay": "true" },
        });
      }
    }

    const body = await req.json();
    const parsed = ReserveSchema.safeParse(body);

    if (!parsed.success) {
      const errBody = {
        error: "Validation error",
        details: parsed.error.flatten(),
      };
      if (idempotencyKey) await storeIdempotency(idempotencyKey, 400, errBody);
      return NextResponse.json(errBody, { status: 400 });
    }

    const { inventoryId, quantity } = parsed.data;
    const result = await createReservation(inventoryId, quantity);

    if (!result.success) {
      let status = 400;
      let message = "Failed to create reservation";

      if (result.error === "INSUFFICIENT_STOCK") {
        status = 409;
        message =
          "Not enough stock available. Another customer may have reserved the last units.";
      } else if (result.error === "INVENTORY_NOT_FOUND") {
        status = 404;
        message = "Inventory record not found";
      }

      const errBody = { error: message, code: result.error };
      if (idempotencyKey) await storeIdempotency(idempotencyKey, status, errBody);
      return NextResponse.json(errBody, { status });
    }

    const resBody = { reservation: result.reservation };
    if (idempotencyKey) await storeIdempotency(idempotencyKey, 201, resBody);
    return NextResponse.json(resBody, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
