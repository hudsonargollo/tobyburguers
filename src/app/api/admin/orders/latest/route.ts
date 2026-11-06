import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// New-order check for the admin bell. The dashboard calls this every few
// seconds with the time of the last order it has seen. Each request finishes
// immediately — no long-lived connection — so it never blocks the browser's
// connection pool (the old SSE stream did, which made admin pages hang) and it
// works the same on a VPS and on serverless hosts like Netlify.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // `reason` lets the dashboard say why it was signed out ("replaced" = signed in elsewhere).
  const { session, reason } = await checkAdmin();
  if (!session) return NextResponse.json({ ok: false, reason }, { status: 401 });

  const sinceParam = new URL(request.url).searchParams.get("since");
  const parsed = sinceParam ? new Date(sinceParam) : null;
  // Never look back more than 10 minutes (avoids a flood after a long sleep).
  const floor = Date.now() - 10 * 60_000;
  const since = new Date(Math.max(parsed && !isNaN(parsed.getTime()) ? parsed.getTime() : Date.now(), floor));

  try {
    const rows = await prisma.order.findMany({
      where: { createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, orderNumber: true, total: true, customerName: true, createdAt: true },
    });
    return NextResponse.json(
      {
        ok: true,
        now: new Date().toISOString(),
        orders: rows.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          total: Number(o.total),
          customerName: o.customerName,
          createdAt: o.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false, orders: [] }, { status: 503 });
  }
}
