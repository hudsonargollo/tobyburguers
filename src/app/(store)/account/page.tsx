import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { BrandLogo } from "@/components/brand/logo";
import { logoutAction, startEmailVerification } from "../auth-actions";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
};

async function getMyOrders(customerId: string): Promise<OrderRow[]> {
  try {
    const rows = await prisma.order.findMany({
      // Only orders linked to this account. Guest orders placed under the same
      // email are NOT listed: email ownership isn't verified at sign-up, so
      // matching by email would expose a stranger's orders. Guests track their
      // orders with order number + email on /account/orders.
      where: { customerId },
      include: { items: { select: { quantity: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    }));
  } catch {
    return [];
  }
}

export default async function AccountPage() {
  const session = await requireCustomer();
  const [orders, verified] = await Promise.all([
    getMyOrders(session.id),
    prisma.customer
      .findUnique({ where: { id: session.id }, select: { emailVerifiedAt: true } })
      .then((c) => Boolean(c?.emailVerifiedAt))
      .catch(() => true), // DB hiccup: don't nag
  ]);
  const firstName = session.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-9" />
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Hola, {firstName}</h1>
            <p className="text-sm text-muted">Te damos la bienvenida a tu cuenta</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="rounded-full border border-[var(--line-strong)] px-5 py-2 text-sm text-ink transition hover:border-accent hover:text-accent-strong">
            Cerrar sesión
          </button>
        </form>
      </div>

      {!verified && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/50 bg-accent/10 px-5 py-4">
          <div>
            <p className="font-medium text-ink">Verifica tu correo</p>
            <p className="text-sm text-muted">
              Enviaremos un código de 6 dígitos a {session.email} para confirmar que es tuyo.
            </p>
          </div>
          <form action={startEmailVerification}>
            <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft">
              Verificar correo
            </button>
          </form>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Profile */}
        <aside className="h-fit rounded-xl border border-[var(--line)] bg-cream-soft p-6">
          <h2 className="eyebrow mb-3">Perfil</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted">Nombre</dt>
              <dd className="text-ink">{session.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Correo</dt>
              <dd className="break-all text-ink">
                {session.email}
                {verified && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    ✓ Verificado
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <Link
            href="/shop"
            className="mt-5 block rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold text-brand-deep transition hover:bg-accent-soft"
          >
            Seguir comprando
          </Link>
        </aside>

        {/* Orders */}
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Historial de pedidos</h2>

          {orders.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-cream-soft py-14 text-center">
              <p className="font-display text-lg text-ink">Aún no tienes pedidos</p>
              <p className="mt-1 text-sm text-muted">
                Cuando hagas un pedido, aparecerá aquí.
              </p>
              <Link
                href="/shop"
                className="mt-5 inline-block text-sm font-medium text-accent-strong hover:underline"
              >
                Empezar a comprar →
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-cream-soft p-5"
                >
                  <div>
                    <p className="font-medium text-ink">{o.orderNumber}</p>
                    <p className="text-sm text-muted">
                      {formatDate(o.createdAt)}{" "}
                      · {o.itemCount} {o.itemCount === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <span className="font-medium text-ink">{formatPrice(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-sm text-muted">
            ¿Hiciste un pedido como invitado?{" "}
            <Link href="/account/orders" className="text-accent-strong hover:underline">
              Rastréalo con tu número de pedido
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
