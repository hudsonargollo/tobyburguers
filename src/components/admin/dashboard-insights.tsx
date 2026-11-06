import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/format";
import { ProductImage } from "@/components/product-image";
import type {
  TopProduct,
  CategorySales,
  AdminCustomerRow,
  PaymentSlice,
  DailyPoint,
} from "@/lib/admin-data";

const card =
  "rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6";

function emptyNote(text: string) {
  return (
    <p className="mt-5 rounded-lg border border-dashed border-[var(--line)] py-8 text-center text-sm text-muted">
      {text}
    </p>
  );
}

/* ── Top selling products ── */
export function TopProductsPanel({ products }: { products: TopProduct[] }) {
  const max = products.reduce((m, p) => Math.max(m, p.revenue), 0) || 1;
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <div>
          <span className="eyebrow">Más vendidos</span>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">Productos más vendidos</h2>
        </div>
        <Link href="/admin/products" className="text-sm text-accent-strong hover:underline">
          Todos los productos →
        </Link>
      </div>
      {products.length === 0 ? (
        emptyNote("Aún no hay ventas: tus productos más vendidos aparecerán aquí.")
      ) : (
        <ol className="mt-4 space-y-3">
          {products.map((p, i) => (
            <li key={p.productId} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-center font-display text-sm font-bold text-accent-strong">
                {i + 1}
              </span>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-sand">
                <ProductImage src={p.image ?? undefined} alt={p.name} seed={p.slug ?? p.productId} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cream-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent-strong"
                    style={{ width: `${Math.max(6, (p.revenue / max) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                  {formatPrice(p.revenue)}
                </p>
                <p className="text-[0.7rem] text-muted">{p.units} vendidos</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ── Sales by category ── */
export function CategorySalesPanel({ categories }: { categories: CategorySales[] }) {
  const max = categories.reduce((m, c) => Math.max(m, c.revenue), 0) || 1;
  return (
    <section className={card}>
      <span className="eyebrow">Composición</span>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Ventas por categoría</h2>
      {categories.length === 0 ? (
        emptyNote("Aún no hay ventas: el rendimiento por categoría aparecerá aquí.")
      ) : (
        <ul className="mt-4 space-y-3.5">
          {categories.map((c) => (
            <li key={c.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-muted">
                  <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                    {formatPrice(c.revenue)}
                  </span>{" "}
                  · {c.share}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-cream-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-accent-strong"
                  style={{ width: `${Math.max(4, (c.revenue / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── New customers ── */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function RecentCustomersPanel({ customers }: { customers: AdminCustomerRow[] }) {
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <div>
          <span className="eyebrow">Audiencia</span>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">Clientes nuevos</h2>
        </div>
        <Link href="/admin/customers" className="text-sm text-accent-strong hover:underline">
          Ver todo →
        </Link>
      </div>
      {customers.length === 0 ? (
        emptyNote("Aún no hay clientes: las registraciones aparecerán aquí.")
      ) : (
        <ul className="mt-4 space-y-3">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-deep text-xs font-semibold text-accent">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                <p className="truncate text-xs text-muted">{c.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                  {formatPrice(c.spent)}
                </p>
                <p className="text-[0.7rem] text-muted">
                  {c.orders} pedido{c.orders === 1 ? "" : "s"} · {formatDate(c.createdAt, { year: false })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Revenue by payment method ── */
const PAY_COLORS: Record<string, string> = {
  COD: "#b81610",
  PAYFAST: "#6366f1",
  SAFEPAY: "#10b981",
};

export function PaymentMethodPanel({ methods }: { methods: PaymentSlice[] }) {
  const max = methods.reduce((m, x) => Math.max(m, x.revenue), 0) || 1;
  return (
    <section className={card}>
      <span className="eyebrow">Pagos</span>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Ingresos por método</h2>
      {methods.length === 0 ? (
        emptyNote("Aún no hay pedidos pagados: el desglose por método de pago aparecerá aquí.")
      ) : (
        <ul className="mt-4 space-y-3.5">
          {methods.map((m) => (
            <li key={m.method}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: PAY_COLORS[m.method] ?? "#7e917f" }}
                  />
                  {m.label}
                </span>
                <span className="text-muted">
                  <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                    {formatPrice(m.revenue)}
                  </span>{" "}
                  · {m.share}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-cream-soft">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (m.revenue / max) * 100)}%`,
                    background: PAY_COLORS[m.method] ?? "#7e917f",
                  }}
                />
              </div>
              <p className="mt-1 text-[0.7rem] text-muted">
                {m.orders} pedido{m.orders === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Sales highlights (from the daily series) ── */
function niceDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y) return "—";
  return formatDate(new Date(y, m - 1, d));
}

export function SalesHighlightsPanel({ points }: { points: DailyPoint[] }) {
  let total = 0;
  let activeDays = 0;
  let best = { time: "", revenue: 0, orders: 0 };
  let busiest = { time: "", revenue: 0, orders: 0 };
  for (const p of points) {
    total += p.revenue;
    if (p.revenue > 0) activeDays++;
    if (p.revenue > best.revenue) best = p;
    if (p.orders > busiest.orders) busiest = p;
  }
  const avgActive = activeDays > 0 ? Math.round(total / activeDays) : 0;

  const tiles = [
    { label: "Mejor día de ventas", value: formatPrice(best.revenue), hint: best.time ? niceDate(best.time) : "—" },
    { label: "Día con más pedidos", value: `${busiest.orders} pedido${busiest.orders === 1 ? "" : "s"}`, hint: busiest.time ? niceDate(busiest.time) : "—" },
    { label: "Media por día de venta", value: formatPrice(avgActive), hint: "En días con ventas" },
    { label: "Días con ventas", value: `${activeDays}`, hint: `de los últimos ${points.length} días` },
  ];

  return (
    <section className={card}>
      <span className="eyebrow">Destacados</span>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Resumen de ventas</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-[var(--line)] bg-cream-soft px-4 py-3">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted">{t.label}</p>
            <p className="mt-1 font-display text-lg font-bold text-ink [font-variant-numeric:tabular-nums]">
              {t.value}
            </p>
            <p className="mt-0.5 text-[0.68rem] text-muted">{t.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
