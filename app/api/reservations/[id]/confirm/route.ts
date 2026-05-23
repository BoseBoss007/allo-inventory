import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservations";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idempotencyKey = req.headers.get("Idempotency-Key");

    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached.cached) {
        return NextResponse.json(cached.body, {
          status: cached.statusCode,
          headers: { "X-Idempotent-Replay": "true" },
        });
      }
    }

    const result = await confirmReservation(id);

    if (!result.success) {
      let status = 400;
      let message = "Cannot confirm reservation";

      if (result.error === "NOT_FOUND") {
        status = 404;
        message = "Reservation not found";
      } else if (result.error === "EXPIRED") {
        status = 410;
        message = "Reservation has expired. Please start a new reservation.";
      } else if (result.error === "ALREADY_CONFIRMED") {
        status = 409;
        message = "Reservation is already confirmed";
      } else if (result.error === "ALREADY_RELEASED") {
        status = 409;
        message = "Reservation has already been released";
      }

      const errBody = { error: message, code: result.error };
      if (idempotencyKey) await storeIdempotency(idempotencyKey, status, errBody);
      return NextResponse.json(errBody, { status });
    }

    const resBody = { reservation: result.reservation };
    if (idempotencyKey) await storeIdempotency(idempotencyKey, 200, resBody);
    return NextResponse.json(resBody);
  } catch (err) {
    console.error("[POST /api/reservations/:id/confirm]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
