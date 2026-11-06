// Payment gateway integration — PayFast (Bolivia) & Safepay.
//
// Both require a merchant account (arranged by the client). Until the relevant
// env vars are set, `configured` is false and checkout falls back to placing a
// pending order (preview mode). Once credentials are added, the online methods
// initiate a real gateway redirect.
//
// NOTE: Endpoint URLs and field names follow each gateway's public docs and may
// need small adjustments to match the client's specific account / API version.
// Callbacks are verified server-side before an order is marked PAID:
//   PayFast  → validation_hash = sha256(basket_id|SECURED_KEY|MERCHANT_ID|err_code)
//   Safepay  → X-SFPY-SIGNATURE = HMAC-SHA512(webhook body, SAFEPAY_WEBHOOK_SECRET)
// Confirm both formulas against the client's merchant documentation at go-live.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type PaymentMethod = "COD" | "PAYFAST" | "SAFEPAY";

export type PaymentInitInput = {
  orderNumber: string;
  amount: number; // BOB
  customer: { name: string; email: string; phone: string };
  returnUrl: string; // where the gateway sends the buyer back on success
  cancelUrl: string; // ... and on failure / cancel
  notifyUrl: string; // server-to-server notification (IPN / webhook)
};

export type PaymentInitResult =
  | { configured: false }
  | { configured: true; ok: true; redirectUrl: string; reference?: string }
  | { configured: true; ok: false; error: string };

// ---------- Config ----------

export function payfastConfigured(): boolean {
  return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_SECURED_KEY);
}

export function safepayConfigured(): boolean {
  // The webhook secret is required too — without it payments can't be verified.
  return Boolean(process.env.SAFEPAY_API_KEY && process.env.SAFEPAY_WEBHOOK_SECRET);
}

export function isOnlineConfigured(method: PaymentMethod): boolean {
  if (method === "PAYFAST") return payfastConfigured();
  if (method === "SAFEPAY") return safepayConfigured();
  return false;
}

// ---------- PayFast ----------

async function initiatePayfast(input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!payfastConfigured()) return { configured: false };

  const sandbox = process.env.PAYFAST_SANDBOX !== "false";
  const base = sandbox
    ? "https://ipguat.apps.net.pk/Ecommerce/api/Transaction"
    : "https://ipg1.apps.net.pk/Ecommerce/api/Transaction";

  try {
    // 1) Get an access token
    const tokenBody = new URLSearchParams({
      MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID!,
      SECURED_KEY: process.env.PAYFAST_SECURED_KEY!,
      BASKET_ID: input.orderNumber,
      TXNAMT: input.amount.toFixed(2),
      CURRENCY_CODE: "BOB",
    });
    const tokenRes = await fetch(`${base}/GetAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
      signal: AbortSignal.timeout(15000),
    });
    const tokenJson = (await tokenRes.json()) as { ACCESS_TOKEN?: string };
    const token = tokenJson.ACCESS_TOKEN;
    if (!token) return { configured: true, ok: false, error: "PayFast token error" };

    // 2) Build the hosted-checkout redirect (buyer completes payment there)
    const params = new URLSearchParams({
      MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID!,
      MERCHANT_NAME: "Toby ¡Mi Hamburguesa!",
      TOKEN: token,
      PROCCODE: "00",
      TXNAMT: input.amount.toFixed(2),
      CUSTOMER_MOBILE_NO: input.customer.phone,
      CUSTOMER_EMAIL_ADDRESS: input.customer.email,
      SIGNATURE: randomBytes(12).toString("hex"),
      VERSION: "Toby-1.0",
      TXNDESC: `Toby ¡Mi Hamburguesa! order ${input.orderNumber}`,
      SUCCESS_URL: input.returnUrl,
      FAILURE_URL: input.cancelUrl,
      CHECKOUT_URL: input.notifyUrl,
      BASKET_ID: input.orderNumber,
      ORDER_DATE: new Date().toISOString(),
      CURRENCY_CODE: "BOB",
    });
    return {
      configured: true,
      ok: true,
      redirectUrl: `${base}/PostTransaction?${params.toString()}`,
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : "PayFast error",
    };
  }
}

// ---------- Safepay ----------

async function initiateSafepay(input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!safepayConfigured()) return { configured: false };

  const sandbox = process.env.SAFEPAY_SANDBOX !== "false";
  const apiBase = sandbox
    ? "https://sandbox.api.getsafepay.com"
    : "https://api.getsafepay.com";
  const environment = sandbox ? "sandbox" : "production";

  try {
    // 1) Initialize an order — returns a tracker token
    const initRes = await fetch(`${apiBase}/order/v1/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: process.env.SAFEPAY_API_KEY,
        amount: input.amount,
        currency: "BOB",
        environment,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const initJson = (await initRes.json()) as { data?: { token?: string } };
    const token = initJson.data?.token;
    if (!token) return { configured: true, ok: false, error: "Safepay init error" };

    // 2) Redirect the buyer to Safepay's hosted checkout
    const params = new URLSearchParams({
      beacon: token,
      env: environment,
      source: "custom",
      order_id: input.orderNumber,
      redirect_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    });
    return {
      configured: true,
      ok: true,
      redirectUrl: `${apiBase}/checkout/pay?${params.toString()}`,
      reference: token, // tracker — the webhook identifies the payment by it
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : "Safepay error",
    };
  }
}

// ---------- Dispatch ----------

export async function initiatePayment(
  method: PaymentMethod,
  input: PaymentInitInput
): Promise<PaymentInitResult> {
  if (method === "PAYFAST") return initiatePayfast(input);
  if (method === "SAFEPAY") return initiateSafepay(input);
  return { configured: false }; // COD needs no gateway
}

// ---------- Callback verification ----------

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPayfastHash(basketId: string, errCode: string, hash: string): boolean {
  const merchant = process.env.PAYFAST_MERCHANT_ID;
  const key = process.env.PAYFAST_SECURED_KEY;
  if (!merchant || !key || !hash) return false;
  const expected = createHash("sha256")
    .update(`${basketId}|${key}|${merchant}|${errCode}`)
    .digest("hex");
  return safeEqual(expected.toLowerCase(), hash.trim().toLowerCase());
}

export function verifySafepaySignature(rawBody: string, dataJson: string, signature: string): boolean {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const sig = signature.trim().toLowerCase();
  // Safepay signs the event's `data` object; accept the raw body form as well.
  return [dataJson, rawBody].some((body) =>
    safeEqual(createHmac("sha512", secret).update(body).digest("hex"), sig)
  );
}
