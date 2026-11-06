import { NextResponse } from "next/server";
import { markOrderPayment } from "@/lib/order-payment";
import { verifyPayfastHash } from "@/lib/payments";
import { siteUrl } from "@/lib/site";

// PayFast sends the buyer back here (SUCCESS_URL / FAILURE_URL, GET) and also
// notifies server-to-server (CHECKOUT_URL, GET or POST). Fields include
// basket_id, err_code ("000" = ok), transaction_amount and validation_hash.
// The order is only updated when validation_hash verifies against our key.

type Fields = { basketId: string; errCode: string; hash: string; amount: number | null };

function pick(get: (k: string) => string | null): Fields {
  const v = (...keys: string[]) => keys.map(get).find((x) => x != null && x !== "") ?? "";
  const amountRaw = v("transaction_amount", "TRANSACTION_AMOUNT", "merchant_amount");
  const amount = amountRaw ? Number(amountRaw) : null;
  return {
    basketId: v("basket_id", "BASKET_ID"),
    errCode: v("err_code", "ERR_CODE"),
    hash: v("validation_hash", "VALIDATION_HASH"),
    amount: amount != null && Number.isFinite(amount) ? amount : null,
  };
}

async function apply(f: Fields): Promise<{ orderNumber: string; success: boolean }> {
  if (!f.basketId || !verifyPayfastHash(f.basketId, f.errCode, f.hash)) {
    if (f.basketId) console.warn(`[payfast] rejected unverified callback for ${f.basketId}`);
    return { orderNumber: f.basketId, success: false };
  }
  const success = f.errCode === "000" || f.errCode === "00";
  await markOrderPayment(f.basketId, success, success ? f.amount : null);
  return { orderNumber: f.basketId, success };
}

// Buyer redirect (and GET-style IPN): verify, then send the shopper on.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { orderNumber, success } = await apply(pick((k) => params.get(k)));
  const target = success
    ? `/checkout/success?order=${encodeURIComponent(orderNumber)}`
    : `/checkout?payment=failed`;
  return NextResponse.redirect(`${siteUrl}${target}`, { status: 303 });
}

// Server-to-server notification.
export async function POST(request: Request) {
  let fields: Fields;
  try {
    const form = await request.formData();
    fields = pick((k) => {
      const v = form.get(k);
      return typeof v === "string" ? v : null;
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { success } = await apply(fields);
  return NextResponse.json({ ok: true, success });
}
