import { getSalesDaily, getAdminStats, getPaymentBreakdown } from "@/lib/admin-data";
import { formatPrice } from "@/lib/format";
import { SalesChartPro } from "@/components/admin/sales-chart-pro";
import { PaymentMethodPanel, SalesHighlightsPanel } from "@/components/admin/dashboard-insights";
import { requireAdmin, scopeBranchId } from "@/lib/admin";

export const metadata = { title: "Analíticas" };

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await requireAdmin(); // layouts don't re-run on client navigation
  const branchId = scopeBranchId(session);
  const [salesDaily, stats, payments] = await Promise.all([
    getSalesDaily(365, branchId),
    getAdminStats(branchId),
    getPaymentBreakdown(branchId),
  ]);

  const aov = stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0;
  const kpis = [
    { label: "Ingresos totales", value: formatPrice(stats.revenue), hint: "Todos los pedidos confirmados" },
    { label: "Pedidos totales", value: String(stats.orders), hint: "Histórico" },
    { label: "Valor medio del pedido", value: formatPrice(aov), hint: "Ingresos ÷ pedidos" },
    { label: "Este mes", value: formatPrice(stats.monthRevenue), hint: "Ingresos de este mes" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Analíticas</h1>
      <p className="mt-1 text-sm text-muted">
        Ingresos diarios: desplázate para hacer zoom, arrastra para moverte y explora cualquier periodo.
      </p>

      {/* KPI summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)]"
          >
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink [font-variant-numeric:tabular-nums]">
              {k.value}
            </p>
            <p className="mt-1 text-xs text-muted">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="mt-6">
        <SalesChartPro points={salesDaily.points} />
      </div>

      {/* Payment split + highlights */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <PaymentMethodPanel methods={payments.methods} />
        <SalesHighlightsPanel points={salesDaily.points} />
      </div>
    </div>
  );
}
