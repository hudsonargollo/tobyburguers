import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/admin";
import { getAdminBranch } from "@/lib/admin-data";
import { BranchForm } from "@/components/admin/branch-form";

export const metadata = { title: "Editar sucursal" };
export const dynamic = "force-dynamic";

export default async function EditBranchPage({ params }: PageProps<"/admin/branches/[id]">) {
  await requireOwner();
  const { id } = await params;
  const branch = await getAdminBranch(id);
  if (!branch) notFound();

  return (
    <div>
      <Link href="/admin/branches" className="text-sm text-muted hover:text-ink">
        ← Volver a sucursales
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Editar sucursal</h1>
      <p className="mt-1 text-sm text-muted">
        {branch.orders} pedido(s) · {branch.users} usuario(s) · {branch.products} producto(s) con
        inventario configurado.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/admin/inventory?branch=${branch.id}`}
          className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-strong"
        >
          Ver inventario
        </Link>
      </div>

      <div className="mt-6">
        <BranchForm mode="edit" branch={branch} />
      </div>
    </div>
  );
}
