import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { getAdminStats, getAdminOrders, getAdminProducts } from "@/lib/admin-data";
import { formatPrice, formatDate } from "@/lib/format";
import { DbBanner } from "@/components/admin/db-banner";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin, scopeBranchId } from "@/lib/admin";
import { TagIcon } from "@/components/icons";

export const metadata = { title: { absolute: "Panel · Toby ¡Mi Hamburguesa!" } };

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireAdmin(); // layouts don't re-run on client navigation
  const branchId = scopeBranchId(session);
  const [stats, ordersData, productsData, settings] = await Promise.all([
    getAdminStats(branchId),
    getAdminOrders(branchId),
    getAdminProducts(branchId),
    getStoreSettings(),
  ]);
  const LOW = settings.inventory.lowStockThreshold;
  const recentOrders = ordersData.orders.slice(0, 5);
  const lowStockProducts = productsData.products
    .filter((p) => p.stock <= LOW)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  const cards = [
    { label: "Ingresos", value: formatPrice(stats.revenue), icon: <CoinIcon />, hint: "Todos los pedidos confirmados" },
    { label: "Este mes", value: formatPrice(stats.monthRevenue), icon: <TrendIcon />, hint: "Ingresos de este mes" },
    { label: "Pedidos", value: String(stats.orders), icon: <BagIcon />, hint: "Histórico" },
    { label: "Pedidos del mes", value: String(stats.monthOrders), icon: <CalendarIcon />, hint: "Realizados este mes" },
    { label: "Pendientes", value: String(stats.pendingOrders), icon: <ClockIcon />, hint: "En espera de gestión" },
    { label: "Productos", value: String(stats.products), icon: <TagIcon />, hint: "En el catálogo" },
    { label: "Clientes", value: String(stats.customers), icon: <UsersIcon />, hint: "Clientes registrados" },
    { label: "Stock bajo", value: String(stats.lowStock), icon: <AlertIcon />, hint: `${LOW} o menos disponibles` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Panel</h1>
          <p className="mt-1 text-sm text-muted">Bienvenido de nuevo al panel de gestión de Toby.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/products/new"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-light transition hover:bg-brand-dark"
          >
            + Agregar producto
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[var(--line-strong)] px-5 py-2.5 text-sm text-ink transition hover:border-accent hover:text-accent-strong"
          >
            Ver tienda
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {!stats.dbConnected && <DbBanner />}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* KPI grid — 8 cards, 2 rows on desktop */}
          {cards.map((c) => (
            <div
              key={c.label}
              className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-26px_rgba(110,10,6,0.55)]"
            >
              {/* accent top accent */}
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-soft via-accent to-accent-strong" />
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-accent shadow-inner">
                  {c.icon}
                </span>
                <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">
                  {c.label}
                </span>
              </div>
              <p className="mt-4 font-display text-3xl font-bold text-ink">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.hint}</p>
            </div>
          ))}
        </div>

        {/* Recent orders + quick actions */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Recent orders */}
          <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-surface p-6 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">Pedidos recientes</h2>
              <Link href="/admin/orders" className="text-sm text-accent-strong hover:underline">
                Ver todo →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-[var(--line)] py-10 text-center text-sm text-muted">
                {stats.dbConnected
                  ? "Aún no hay pedidos. Aparecerán aquí a medida que lleguen."
                  : "Conecta la base de datos para ver los pedidos."}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-muted">
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-cream-soft">
                        <td className="py-3 pr-3">
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-accent-strong hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 text-ink">{o.customerName}</td>
                        <td className="py-3 pr-3 text-ink">{formatPrice(o.total)}</td>
                        <td className="py-3 pr-3"><StatusBadge status={o.status} /></td>
                        <td className="py-3 text-muted">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <aside className="space-y-3">
            <h2 className="eyebrow mb-1">Acciones rápidas</h2>
            <QuickAction href="/admin/analytics" title="Analíticas" desc="Gráfico de ventas y tendencias" icon={<TrendIcon />} />
            <QuickAction href="/admin/insights" title="Tendencias" desc="Más vendidos y composición" icon={<CoinIcon />} />
            <QuickAction href="/admin/performance" title="Rendimiento" desc="Salud y flujo" icon={<ClockIcon />} />
            <QuickAction href="/admin/products/new" title="Agregar un producto" desc="Crea un producto nuevo" icon={<TagIcon />} />
            <QuickAction href="/admin/orders" title="Gestionar pedidos" desc="Actualiza y envía pedidos" icon={<BagIcon />} />
          </aside>
        </div>

        {/* Low stock */}
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-surface p-6 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15">
                <AlertIcon />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Alerta de stock bajo</h2>
                <p className="text-xs text-muted">Productos con {LOW} o menos disponibles: repón pronto.</p>
              </div>
            </div>
            <Link href="/admin/products" className="shrink-0 text-sm text-accent-strong hover:underline">
              Todos los productos →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-[var(--line)] py-8 text-center text-sm text-muted">
              {stats.dbConnected
                ? "Todo bien: todos los productos tienen stock suficiente. ✓"
                : "Conecta la base de datos para ver los niveles de stock."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-cream-soft px-4 py-3 transition hover:border-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink group-hover:text-accent-strong">
                      {p.name}
                    </span>
                    <span className="text-xs text-muted">{formatPrice(p.price)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      p.stock === 0
                        ? "bg-red-100 text-red-700 dark:bg-red-500/15"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15"
                    }`}
                  >
                    {p.stock === 0 ? "Agotado" : `${p.stock} disponibles`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[var(--line)] bg-surface p-4 shadow-[0_10px_30px_-24px_rgba(110,10,6,0.4)] transition hover:border-accent hover:shadow-[0_16px_36px_-26px_rgba(110,10,6,0.5)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-accent-strong transition group-hover:bg-brand group-hover:text-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
      <span className="text-accent-strong transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/* icons */
function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h3a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h3" strokeLinecap="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
      <path d="M9 8a3 3 0 0 1 6 0" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 16l5-5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6M18 19a5.5 5.5 0 0 0-3-4.9" strokeLinecap="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 4l9 15H3l9-15z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}
