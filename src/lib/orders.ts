import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { shippingFor } from "./settings-shared";
import { getStoreSettings } from "./settings";
import { shippingForBranch } from "./branch";
import { after } from "next/server";
import { sendOrderEmails } from "./email";
import { refreshCatalog } from "./cache-tags";

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  email: z.string().trim().email("Ingresa un correo válido").max(200),
  phone: z.string().trim().min(7, "Ingresa un teléfono válido").max(30),
  branchId: z.string().min(1, "Elige la sucursal donde harás tu pedido"),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  address: z.string().trim().max(500).nullish(),
  city: z.string().trim().max(100).nullish(),
  postalCode: z.string().max(20).nullish(),
  notes: z.string().max(1000).nullish(),
  paymentMethod: z.enum(["COD", "PAYFAST", "SAFEPAY"]),
  items: z
    .array(
      z.object({
        productId: z.string().max(100),
        name: z.string().max(200),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1, "Tu carrito está vacío")
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CreateOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

// User-facing validation problems (bad cart) vs unexpected server errors.
class OrderValidationError extends Error {}

// Unambiguous alphabet (no 0/O, 1/I/L). 8 crypto-random chars ≈ 40 bits, so
// order numbers can't be guessed (they also act as a lookup key with the email).
const ORDER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateOrderNumber(branchCode: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  let rand = "";
  for (let i = 0; i < 8; i++) rand += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `${branchCode}-${stamp}-${rand}`;
}

// Cancels an order exactly once and puts its items back into that branch's stock.
// Safe to call repeatedly — only the call that flips the status restocks.
export async function cancelOrderAndRestock(orderId: string): Promise<boolean> {
  const restocked = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { branchId: true, status: true },
    });
    if (!order || order.status === "CANCELLED") return false;
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    });
    if (res.count !== 1) return false;
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });
    for (const i of items) {
      await tx.branchStock.updateMany({
        where: { branchId: order.branchId, productId: i.productId },
        data: { stock: { increment: i.quantity } },
      });
    }
    return true;
  });
  if (restocked) refreshCatalog();
  return restocked;
}

export async function createOrder(
  input: CheckoutInput,
  customerId?: string | null
): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Pedido inválido" };
  }
  const data = parsed.data;

  // Delivery needs a real address; pickup happens at the branch.
  const isPickup = data.fulfillment === "PICKUP";
  const address = data.address?.trim() || null;
  const city = data.city?.trim() || null;
  if (!isPickup && (!address || address.length < 5)) {
    return { ok: false, error: "Ingresa tu dirección de entrega" };
  }
  if (!isPickup && (!city || city.length < 2)) {
    return { ok: false, error: "Ingresa tu ciudad" };
  }

  try {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, active: true },
    });
    if (!branch) {
      throw new OrderValidationError("La sucursal elegida no está disponible. Elige otra.");
    }
    if (isPickup && !branch.pickupEnabled) {
      throw new OrderValidationError("Esta sucursal no ofrece retiro en tienda. Elige otra modalidad.");
    }
    if (!isPickup && !branch.deliveryEnabled) {
      throw new OrderValidationError("Esta sucursal no ofrece entrega a domicilio. Puedes elegir retiro.");
    }

    // Re-price against the database to prevent client-side tampering,
    // validate branch stock, then create the order and decrement stock atomically.
    const ids = data.items.map((i) => i.productId);
    const stocks = await prisma.branchStock.findMany({
      where: { branchId: branch.id, productId: { in: ids }, active: true, product: { active: true } },
      select: {
        productId: true,
        stock: true,
        product: { select: { id: true, name: true, price: true } },
      },
    });
    const byId = new Map(stocks.map((s) => [s.productId, s]));

    // Merge duplicate lines for the same product so stock checks are per product.
    const qtyById = new Map<string, number>();
    for (const i of data.items) qtyById.set(i.productId, (qtyById.get(i.productId) ?? 0) + i.quantity);

    const lineItems = [...qtyById].map(([productId, quantity]) => {
      const s = byId.get(productId);
      const name = data.items.find((i) => i.productId === productId)?.name ?? "Un producto";
      if (!s)
        throw new OrderValidationError(
          `"${name}" ya no está disponible en esta sucursal. Quítalo de tu carrito e inténtalo de nuevo.`
        );
      if (s.stock < quantity)
        throw new OrderValidationError(
          s.stock <= 0
            ? `"${s.product.name}" está agotado en esta sucursal. Quítalo de tu carrito.`
            : `Solo quedan ${s.stock} de "${s.product.name}" en esta sucursal. Baja la cantidad.`
        );
      return { productId: s.product.id, name: s.product.name, price: Number(s.product.price), quantity };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
    // Shipping rules come from the branch (falling back to store-wide settings).
    const settings = await getStoreSettings();
    const branchView = {
      flatFee: branch.flatFee == null ? null : Number(branch.flatFee),
      freeThreshold: branch.freeThreshold == null ? null : Number(branch.freeThreshold),
    };
    const shipping = isPickup ? 0 : shippingFor(subtotal, shippingForBranch(branchView, settings));
    const total = subtotal + shipping;
    const email = data.email.trim().toLowerCase();

    // Only attach a customerId that actually exists — a stale session cookie
    // pointing at a deleted account would otherwise cause a foreign-key error.
    let safeCustomerId: string | null = null;
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });
      safeCustomerId = customer?.id ?? null;
    }

    // Decrement stock *conditionally* inside the transaction so two concurrent
    // checkouts can never oversell: the update only matches while enough stock
    // remains at that branch, otherwise the whole order rolls back.
    let orderNumber = "";
    let createdOrder: { id: string; createdAt: Date } | null = null;
    for (let attempt = 0; attempt < 3 && !createdOrder; attempt++) {
      orderNumber = generateOrderNumber(branch.code);
      try {
        createdOrder = await prisma.$transaction(async (tx) => {
          for (const i of lineItems) {
            const res = await tx.branchStock.updateMany({
              where: {
                branchId: branch.id,
                productId: i.productId,
                active: true,
                stock: { gte: i.quantity },
              },
              data: { stock: { decrement: i.quantity } },
            });
            if (res.count !== 1)
              throw new OrderValidationError(
                `"${i.name}" se agotó o quedan menos unidades en esta sucursal. Actualiza tu carrito.`
              );
          }
          return tx.order.create({
            data: {
              orderNumber,
              branchId: branch.id,
              fulfillment: data.fulfillment,
              customerName: data.customerName.trim(),
              email,
              phone: data.phone.trim(),
              address,
              city,
              postalCode: data.postalCode?.trim() || null,
              notes: data.notes?.trim() || null,
              paymentMethod: data.paymentMethod,
              customerId: safeCustomerId,
              subtotal,
              shipping,
              total,
              items: { create: lineItems },
            },
            select: { id: true, createdAt: true },
          });
        });
      } catch (err) {
        // Retry only on an (astronomically unlikely) order-number collision.
        const msg = err instanceof Error ? err.message : "";
        if (!(err instanceof OrderValidationError) && /P2002|Unique constraint/i.test(msg) && /orderNumber/.test(msg)) continue;
        throw err;
      }
    }
    if (!createdOrder) throw new Error("Could not allocate an order number");
    refreshCatalog(); // stock changed

    // (Admins see new orders via the dashboard bell, which polls /api/admin/orders/latest.)

    // Order is safely saved. Email is best-effort — never fail a saved order
    // just because SMTP is unavailable — and it goes out after the reply, so
    // the shopper reaches the confirmation page without waiting on SMTP.
    after(async () => {
      try {
        await sendOrderEmails({
          orderNumber,
          customerName: data.customerName,
          email,
          phone: data.phone,
          address: address ?? `Retiro en ${branch.name}`,
          city: city ?? branch.city,
          branchName: branch.name,
          fulfillment: data.fulfillment,
          paymentMethod: data.paymentMethod,
          items: lineItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotal,
          shipping,
          total,
        });
      } catch (emailErr) {
        console.error("[order] email send failed (order still saved):", emailErr);
      }
    });

    return { ok: true, orderNumber, total };
  } catch (err) {
    // Cart/stock problems are safe to show to the customer verbatim.
    if (err instanceof OrderValidationError) {
      return { ok: false, error: err.message };
    }
    // Anything else is an unexpected server/database error. Log the real
    // cause for us, show the customer a clear (non-fake) failure — never a
    // fake success that silently loses the order.
    console.error("[order] failed to create order:", err);
    return {
      ok: false,
      error: "Lo sentimos, no pudimos registrar tu pedido ahora. Inténtalo de nuevo en un momento.",
    };
  }
}
