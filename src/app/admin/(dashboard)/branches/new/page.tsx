import Link from "next/link";
import { requireOwner } from "@/lib/admin";
import { BranchForm } from "@/components/admin/branch-form";

export const metadata = { title: "Nueva sucursal" };
export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  await requireOwner();

  return (
    <div>
      <Link href="/admin/branches" className="text-sm text-muted hover:text-ink">
        ← Volver a sucursales
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Nueva sucursal</h1>
      <p className="mt-1 text-sm text-muted">
        Los clientes podrán elegir esta sucursal al comprar y su equipo verá solo sus pedidos.
      </p>

      <div className="mt-6">
        <BranchForm mode="create" />
      </div>
    </div>
  );
}
