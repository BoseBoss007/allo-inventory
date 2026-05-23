import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredReservations();
  console.log(`[cron] Released ${released} expired reservations`);

  return NextResponse.json({
    ok: true,
    releasedCount: released,
    timestamp: new Date().toISOString(),
  });
}
