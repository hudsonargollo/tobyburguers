import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/admin-data";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ShipmentPanel } from "@/components/admin/shipment-panel";
import { StatusUpdateForm } from "@/components/admin/status-update-form";
import { updateOrderStatus, updatePaymentStatus } from "../actions";
import { ORDER_TRANSITIONS, PAYMENT_TRANSITIONS } from "@/lib/order-status";
import { courierLabel, trackingUrl } from "@/lib/couriers";
import { requireAdmin, scopeBranchId } from "@/lib/admin";

export const metadata = { title: "Detalle del pedido" };

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const session = await requireAdmin(); // layouts don't re-run on client navigation
  const { id } = await params;
  const order = await getAdminOrder(id, scopeBranchId(session));
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">
        ← Volver a pedidos
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <Link
          href={`/admin/invoice/${order.id}`}
          className="ml-auto rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-strong"
        >
          Imprimir factura / hoja de embalaje
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Realizado el {new Date(order.createdAt).toLocaleString("es-BO")} ·{" "}
        <span className="font-medium text-ink">{order.branch.name}</span> ({order.branch.code}) ·{" "}
        {order.fulfillment === "PICKUP" ? "Retiro en tienda" : "Entrega a domicilio"}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items + totals */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Cant.</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 text-ink">{i.name}</td>
                    <td className="px-4 py-3 text-muted">{formatPrice(i.price)}</td>
                    <td className="px-4 py-3 text-muted">{i.quantity}</td>
                    <td className="px-4 py-3 text-right text-ink">
                      {formatPrice(i.price * i.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1.5 border-t border-[var(--line)] px-4 py-4 text-sm">
              <Line label="Subtotal" value={formatPrice(order.subtotal)} />
              <Line label="Envío" value={order.shipping === 0 ? "Gratis" : formatPrice(order.shipping)} />
              <div className="flex justify-between border-t border-[var(--line)] pt-2 font-medium text-ink">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-xl border border-[var(--line)] bg-surface p-5 text-sm">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Cliente</h2>
            <dl className="space-y-1.5">
              <Info label="Nombre" value={order.customerName} />
              <Info label="Correo electrónico" value={order.email} />
              <Info label="Teléfono" value={order.phone} />
              <Info label="Sucursal" value={`${order.branch.name} (${order.branch.code})`} />
              <Info
                label="Entrega"
                value={order.fulfillment === "PICKUP" ? "Retiro en tienda" : "Entrega a domicilio"}
              />
              <Info
                label={order.fulfillment === "PICKUP" ? "Retiro en" : "Dirección"}
                value={
                  order.fulfillment === "PICKUP"
                    ? `${order.branch.address}, ${order.branch.city}`
                    : `${order.address ?? ""}, ${order.city ?? ""}${order.postalCode ? ` ${order.postalCode}` : ""}`
                }
              />
              {order.notes && <Info label="Notas" value={order.notes} />}
            </dl>
          </div>
        </div>

        {/* Status controls */}
        <aside className="space-y-5">
          {order.fulfillment === "DELIVERY" && (
            <ShipmentPanel
              id={order.id}
              booked={!!order.trackingNumber}
              courierName={order.courier ? courierLabel(order.courier) : undefined}
              trackingNumber={order.trackingNumber}
              trackUrl={order.courier && order.trackingNumber ? trackingUrl(order.courier, order.trackingNumber) : undefined}
            />
          )}

          <div className="rounded-xl border border-[var(--line)] bg-surface p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Estado del pedido</h2>
            <StatusUpdateForm
              action={updateOrderStatus.bind(null, order.id)}
              name="status"
              defaultValue={order.status}
              options={[order.status, ...ORDER_TRANSITIONS[order.status]]}
              successMessage="Estado del pedido actualizado"
            />
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-surface p-5">
            <h2 className="mb-1 font-display text-lg font-semibold text-ink">Pago</h2>
            <p className="mb-3 text-sm text-muted">Método: {order.paymentMethod}</p>
            <StatusUpdateForm
              action={updatePaymentStatus.bind(null, order.id)}
              name="paymentStatus"
              defaultValue={order.paymentStatus}
              options={[order.paymentStatus, ...PAYMENT_TRANSITIONS[order.paymentStatus]]}
              successMessage="Estado del pago actualizado"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
