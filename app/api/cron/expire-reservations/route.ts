import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await releaseExpiredReservations();
  console.log(`[cron] released ${count} expired reservations`);

  return NextResponse.json({ ok: true, released: count, at: new Date().toISOString() });
}
