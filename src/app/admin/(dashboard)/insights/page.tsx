import { getSalesBreakdown, getRecentCustomers } from "@/lib/admin-data";
import {
  TopProductsPanel,
  CategorySalesPanel,
  RecentCustomersPanel,
} from "@/components/admin/dashboard-insights";
import { requireAdmin, scopeBranchId } from "@/lib/admin";

export const metadata = { title: "Tendencias" };

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await requireAdmin(); // layouts don't re-run on client navigation
  const branchId = scopeBranchId(session);
  const [breakdown, recent] = await Promise.all([
    getSalesBreakdown(branchId),
    getRecentCustomers(6, branchId),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Tendencias</h1>
      <p className="mt-1 text-sm text-muted">
        Más vendidos, composición por categoría y tus clientes más recientes.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TopProductsPanel products={breakdown.topProducts} />
        <CategorySalesPanel categories={breakdown.categories} />
      </div>

      <div className="mt-6">
        <RecentCustomersPanel customers={recent.customers} />
      </div>
    </div>
  );
}
