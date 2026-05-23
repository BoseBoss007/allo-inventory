import { NextRequest, NextResponse } from "next/server";
import { ReserveSchema } from "@/lib/schemas";
import { createReservation } from "@/lib/reservations";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(req: NextRequest) {
  try {
    const ikey = req.headers.get("Idempotency-Key");

    if (ikey) {
      const cached = await checkIdempotency(ikey);
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
      const errBody = { error: "Validation error", details: parsed.error.flatten() };
      if (ikey) await storeIdempotency(ikey, 400, errBody);
      return NextResponse.json(errBody, { status: 400 });
    }

    const result = await createReservation(parsed.data.inventoryId, parsed.data.quantity);

    if (!result.success) {
      const status = result.error === "INSUFFICIENT_STOCK" ? 409 : 404;
      const message =
        result.error === "INSUFFICIENT_STOCK"
          ? "Not enough stock — another customer may have just grabbed those units."
          : "Inventory record not found";
      const errBody = { error: message, code: result.error };
      if (ikey) await storeIdempotency(ikey, status, errBody);
      return NextResponse.json(errBody, { status });
    }

    const resBody = { reservation: result.reservation };
    if (ikey) await storeIdempotency(ikey, 201, resBody);
    return NextResponse.json(resBody, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
