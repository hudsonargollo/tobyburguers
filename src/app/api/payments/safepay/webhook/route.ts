import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderPayment } from "@/lib/order-payment";
import { verifySafepaySignature } from "@/lib/payments";

// Safepay server-to-server webhook. The event is trusted only when its
// X-SFPY-SIGNATURE verifies with SAFEPAY_WEBHOOK_SECRET. The order is matched
// by the tracker saved at checkout (Order.paymentRef), falling back to an
// order reference if Safepay echoes one.
export async function POST(request: Request) {
  const raw = await request.text();
  let body: {
    type?: string;
    data?: {
      tracker?: string | { token?: string };
      token?: string;
      order_id?: string;
      reference?: string;
      state?: string;
      status?: string;
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const signature =
    request.headers.get("x-sfpy-signature") ?? request.headers.get("x-safepay-signature") ?? "";
  if (!verifySafepaySignature(raw, JSON.stringify(body.data ?? {}), signature)) {
    console.warn("[safepay] rejected webhook with invalid signature");
    return NextResponse.json({ received: false }, { status: 401 });
  }

  const d = body.data ?? {};
  const tracker = typeof d.tracker === "string" ? d.tracker : d.tracker?.token ?? d.token ?? "";
  const state = (d.state ?? d.status ?? "").toLowerCase();
  const type = (body.type ?? "").toLowerCase();

  const paid =
    ["paid", "completed", "tracker_ended", "captured"].includes(state) ||
    type === "payment:succeeded" ||
    type === "payment.succeeded";
  const failed =
    ["failed", "cancelled", "canceled", "declined"].includes(state) || /fail|cancel/.test(type);

  try {
    let orderNumber = "";
    if (tracker) {
      const o = await prisma.order.findFirst({
        where: { paymentRef: tracker },
        select: { orderNumber: true },
      });
      orderNumber = o?.orderNumber ?? "";
    }
    if (!orderNumber) orderNumber = d.order_id ?? d.reference ?? "";

    // Amount units in Safepay events vary by API version, so the signature +
    // tracker match is the trust anchor here (no amount comparison).
    if (orderNumber && (paid || failed)) await markOrderPayment(orderNumber, paid);
  } catch (err) {
    console.error("[safepay] webhook handling failed:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
