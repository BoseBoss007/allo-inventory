import { NextRequest, NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservations";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const result = await releaseReservation(id);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      ALREADY_CONFIRMED: 409,
      ALREADY_RELEASED: 409,
    };
    const messageMap: Record<string, string> = {
      NOT_FOUND: "Reservation not found",
      ALREADY_CONFIRMED: "Can't release a confirmed reservation",
      ALREADY_RELEASED: "Already released",
    };
    const status = statusMap[result.error!] ?? 400;
    const errBody = { error: messageMap[result.error!] ?? "Cannot release", code: result.error };
    if (ikey) await storeIdempotency(ikey, status, errBody);
    return NextResponse.json(errBody, { status });
  }

  const resBody = { reservation: result.reservation };
  if (ikey) await storeIdempotency(ikey, 200, resBody);
  return NextResponse.json(resBody);
}
