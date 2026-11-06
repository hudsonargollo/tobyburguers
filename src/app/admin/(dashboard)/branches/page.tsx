import Link from "next/link";
import { requireOwner } from "@/lib/admin";
import { getAdminBranches } from "@/lib/admin-data";
import { DbBanner } from "@/components/admin/db-banner";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteBranch, toggleBranchActive } from "./actions";

export const metadata = { title: "Sucursales" };
export const dynamic = "force-dynamic";

const FLASH: Record<string, { tone: "ok" | "error"; text: string }> = {
  "branch-deleted": { tone: "ok", text: "Sucursal eliminada." },
  "branch-in-use": {
    tone: "error",
    text: "No se puede eliminar: la sucursal tiene pedidos o usuarios asignados. Desactívala en su lugar.",
  },
  "branch-missing": { tone: "error", text: "La sucursal ya no existe." },
  "branch-delete-failed": { tone: "error", text: "No se pudo eliminar la sucursal." },
};

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  await requireOwner();
  const [{ dbConnected, branches }, params] = await Promise.all([getAdminBranches(), searchParams]);
  const flash = params.flash ? FLASH[params.flash] : null;
  const active = branches.filter((b) => b.active).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Sucursales</h1>
          <p className="mt-1 text-sm text-muted">
            {active} de {branches.length} activas. El catálogo es compartido; cada sucursal tiene su
            propio inventario, equipo y pedidos.
          </p>
        </div>
        <Link
          href="/admin/branches/new"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-light transition hover:bg-brand-dark"
        >
          + Nueva sucursal
        </Link>
      </div>

      {flash && (
        <p
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            flash.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {flash.text}
        </p>
      )}

      {!dbConnected && <div className="mt-6"><DbBanner /></div>}

      {branches.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-cream-soft py-16 text-center">
          <p className="font-display text-xl text-ink">Aún no hay sucursales</p>
          <p className="mt-1 text-sm text-muted">
            {dbConnected
              ? "Crea la primera sucursal para que los clientes puedan elegir dónde comprar."
              : "Conecta la base de datos para gestionar sucursales."}
          </p>
          {dbConnected && (
            <Link href="/admin/branches/new" className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-light">
              + Nueva sucursal
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--line)] bg-cream-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Inventario</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className={`border-b border-[var(--line)] last:border-0 ${b.active ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/branches/${b.id}`} className="font-medium text-ink hover:text-accent-strong">
                      {b.name}
                    </Link>
                    <p className="text-xs text-muted">Código {b.code}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <p>{b.address}</p>
                    <p className="text-xs">{b.city}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          b.deliveryEnabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        Envío
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          b.pickupEnabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        Retiro
                      </span>
                    </div>
                    {b.flatFee != null && <p className="mt-1 text-xs text-muted">Envío Bs {b.flatFee}</p>}
                    {b.freeThreshold != null && (
                      <p className="text-xs text-muted">Gratis desde Bs {b.freeThreshold}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{b.products}</td>
                  <td className="px-4 py-3 text-ink">{b.users}</td>
                  <td className="px-4 py-3 text-ink">{b.orders}</td>
                  <td className="px-4 py-3">
                    <form action={toggleBranchActive.bind(null, b.id)}>
                      <input type="hidden" name="active" value={b.active ? "0" : "1"} />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                          b.active ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={b.active ? "Desactivar sucursal" : "Activar sucursal"}
                      >
                        {b.active ? "Activa" : "Inactiva"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/admin/branches/${b.id}`} className="text-sm text-accent-strong hover:underline">
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteBranch.bind(null, b.id)}
                        confirmText={`¿Eliminar «${b.name}»? Solo es posible si no tiene pedidos ni usuarios.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
