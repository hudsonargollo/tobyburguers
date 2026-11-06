// Plain constants (safe to import anywhere — not a "use server" module).
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Allowed order-status moves. DELIVERED and CANCELLED are final (cancelling
// restores stock, so un-cancelling would double-count inventory).
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "PROCESSING", "SHIPPED", "CANCELLED"],
  CONFIRMED: ["PENDING", "PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["CONFIRMED", "SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  FAILED: ["PENDING", "PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canMovePayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "Pago contra entrega",
  PAYFAST: "Tarjeta (PayFast)",
  SAFEPAY: "Tarjeta / billetera (Safepay)",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};
