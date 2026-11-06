import { prisma } from "./prisma";

export type OrderLookupItem = { name: string; quantity: number; price: number };

export type OrderLookupResult =
  | {
      ok: true;
      order: {
        orderNumber: string;
        status: string;
        paymentStatus: string;
        paymentMethod: string;
        total: number;
        createdAt: string;
        courier: string | null;
        trackingNumber: string | null;
        items: OrderLookupItem[];
      };
    }
  | { ok: false; reason: "not-found" | "db-down" };

// Looks up an order by its number + the email used at checkout.
export async function lookupOrder(
  orderNumber: string,
  email: string
): Promise<OrderLookupResult> {
  try {
    const o = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim(),
        // Older orders stored the email as typed — match case-insensitively.
        email: { equals: email.trim(), mode: "insensitive" },
      },
      include: { items: true },
    });
    if (!o) return { ok: false, reason: "not-found" };
    return {
      ok: true,
      order: {
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        courier: o.courier,
        trackingNumber: o.trackingNumber,
        items: o.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      },
    };
  } catch {
    return { ok: false, reason: "db-down" };
  }
}
