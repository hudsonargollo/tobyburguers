// Courier integration for Bolivia — Leopards & TCS.
//
// Live booking needs the client's courier MERCHANT account API credentials,
// set as environment variables (see below). Until those are set, bookShipment
// runs in SIMULATION mode: it generates a realistic tracking number so the
// whole order → ship → track flow works for demos/testing. The moment the
// real keys are added, the same call books a live shipment automatically.
//
// Env vars to go live:
//   Leopards:  LEOPARDS_API_KEY, LEOPARDS_API_PASSWORD
//   TCS:       TCS_USERNAME, TCS_PASSWORD, TCS_CLIENT_ID, TCS_CLIENT_SECRET, TCS_COST_CENTER

export type Courier = "LEOPARDS" | "TCS";

export type BookResult =
  | { ok: true; trackingNumber: string; simulated: boolean }
  | { ok: false; error: string };

type OrderForShipment = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
};

export function isCourier(v: string): v is Courier {
  return v === "LEOPARDS" || v === "TCS";
}

export function courierLabel(c: string): string {
  if (c === "LEOPARDS") return "Leopards Courier";
  if (c === "TCS") return "TCS";
  return c;
}

export function trackingUrl(courier: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber);
  if (courier === "LEOPARDS") return `https://www.leopardscourier.com/leopards-tracking?tracking_number=${tn}`;
  if (courier === "TCS") return `https://www.tcsexpress.com/track/?consignmentNo=${tn}`;
  return "#";
}

// Simulation is for development/demos only. In production a missing courier
// key is an error unless COURIER_SIMULATION=true is set explicitly; otherwise
// orders would be marked SHIPPED with a fake tracking number.
function simulationAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.COURIER_SIMULATION === "true";
}

function notConfigured(name: string): BookResult {
  return {
    ok: false,
    error: `${name}: las credenciales de la API aún no están configuradas. Agrégalas al entorno del servidor para reservar envíos.`,
  };
}

function simulatedTracking(courier: Courier): string {
  const n = Math.floor(100000000 + Math.random() * 899999999);
  return courier === "LEOPARDS" ? `LE${n}` : `TCS${n}`;
}

export async function bookShipment(order: OrderForShipment, courier: Courier): Promise<BookResult> {
  try {
    if (courier === "LEOPARDS") return await bookLeopards(order);
    return await bookTcs(order);
  } catch (err) {
    console.error("[courier] booking failed:", err);
    return { ok: false, error: "No se pudo reservar el envío. Inténtalo de nuevo." };
  }
}

// ---------------- Leopards ----------------
async function bookLeopards(order: OrderForShipment): Promise<BookResult> {
  const key = process.env.LEOPARDS_API_KEY;
  const pass = process.env.LEOPARDS_API_PASSWORD;

  // No credentials yet → simulate so the flow works.
  if (!key || !pass) {
    if (!simulationAllowed()) return notConfigured("Leopards");
    return { ok: true, trackingNumber: simulatedTracking("LEOPARDS"), simulated: true };
  }

  const origin = process.env.LEOPARDS_ORIGIN_CITY || "Santa Cruz";
  const res = await fetch("https://merchantapi.leopardscourier.com/api/bookPacket/format/json/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      api_password: pass,
      booked_packet_weight: Math.max(500, order.itemCount * 250), // grams
      booked_packet_no_piece: order.itemCount || 1,
      booked_packet_collect_amount: order.paymentMethod === "COD" ? order.total : 0,
      booked_packet_order_id: order.orderNumber,
      origin_city: origin,
      destination_city: order.city,
      shipment_name_eng: order.customerName,
      shipment_email: order.email,
      shipment_phone: order.phone,
      shipment_address: order.address,
      shipment_item_desc: "productos",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  const tn = data?.track_number || data?.trackNumber;
  if (data?.status && tn) return { ok: true, trackingNumber: String(tn), simulated: false };
  return { ok: false, error: data?.error || "Leopards no devolvió un número de seguimiento." };
}

// ---------------- TCS ----------------
async function bookTcs(order: OrderForShipment): Promise<BookResult> {
  const user = process.env.TCS_USERNAME;
  const pass = process.env.TCS_PASSWORD;
  const clientId = process.env.TCS_CLIENT_ID;
  const clientSecret = process.env.TCS_CLIENT_SECRET;

  if (!user || !pass || !clientId || !clientSecret) {
    if (!simulationAllowed()) return notConfigured("TCS");
    return { ok: true, trackingNumber: simulatedTracking("TCS"), simulated: true };
  }

  const origin = process.env.TCS_ORIGIN_CITY || "Santa Cruz";
  const res = await fetch("https://api.tcscourier.com/production/v1/cod/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IBM-Client-Id": clientId,
      "X-IBM-Client-Secret": clientSecret,
    },
    body: JSON.stringify({
      userName: user,
      password: pass,
      costCenterCode: process.env.TCS_COST_CENTER || "",
      consigneeName: order.customerName,
      consigneeAddress: order.address,
      consigneeMobNo: order.phone,
      consigneeEmail: order.email,
      originCityName: origin,
      destinationCityName: order.city,
      weight: Math.max(0.5, (order.itemCount || 1) * 0.25),
      pieces: order.itemCount || 1,
      codAmount: order.paymentMethod === "COD" ? order.total : 0,
      customerReferenceNo: order.orderNumber,
      services: "O", // overnight
      productDetails: "productos",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  const tn = data?.consignmentNo || data?.consignmentNumber || data?.trackingNumber;
  if (tn) return { ok: true, trackingNumber: String(tn), simulated: false };
  return { ok: false, error: data?.returnStatus?.message || "TCS no devolvió un número de seguimiento." };
}
