import { getAdminCategories } from "@/lib/admin-data";
import { DbBanner } from "@/components/admin/db-banner";
import { AddCategoryForm } from "@/components/admin/category-form";
import { deleteCategory } from "./actions";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Categorías" };

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin(); // layouts don't re-run on client navigation
  const { dbConnected, categories } = await getAdminCategories();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Categorías</h1>
      <p className="mt-1 text-sm text-muted">Organiza tu catálogo: agrega nuevas colecciones aquí.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* List */}
        <div className="min-w-0">
          {!dbConnected && <DbBanner />}
          <div className="rounded-2xl border border-[var(--line)] bg-surface shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[0.68rem] uppercase tracking-wider text-muted">
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Productos</th>
                    <th className="px-4 py-3 text-right font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-4 py-3">
                        <span className="block font-medium text-ink">{c.name}</span>
                        {c.description && <span className="block text-xs text-muted">{c.description}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">/{c.slug}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-cream-soft px-2.5 py-0.5 text-xs text-ink">
                          {c.products}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.products > 0 ? (
                          <span className="text-xs text-muted" title="Elimina o mueve sus productos primero">
                            En uso
                          </span>
                        ) : (
                          <DeleteButton
                            action={deleteCategory.bind(null, c.id)}
                            confirmText={`¿Eliminar la categoría «${c.name}»? Esta acción no se puede deshacer.`}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add form */}
        <aside>
          <div className="rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-24px_rgba(110,10,6,0.4)]">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Agregar una categoría</h2>
            <AddCategoryForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
