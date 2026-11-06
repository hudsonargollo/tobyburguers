import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/logo";
import { OrderLookup } from "@/components/order-lookup";

export const metadata: Metadata = {
  title: "Estado del pedido",
  description: "Rastrea tu pedido de Toby ¡Mi Hamburguesa! — ingresa tu número de pedido y correo.",
  alternates: { canonical: "/account/orders" },
};

export default async function OrderStatusPage({
  searchParams,
}: PageProps<"/account/orders">) {
  const sp = await searchParams;
  // Only the order number may be pre-filled from a link — never the email.
  const orderNumber = (Array.isArray(sp.order) ? sp.order[0] : sp.order)?.trim() ?? "";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <div className="text-center">
        <BrandLogo className="mx-auto h-10" />
        <span className="eyebrow mt-3 block">Ayuda</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Estado del pedido</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Ingresa tu número de pedido y el correo usado al pagar para ver el estado.
        </p>
      </div>

      <OrderLookup defaultOrder={orderNumber} />
    </div>
  );
}
