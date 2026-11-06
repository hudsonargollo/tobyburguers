import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, getCategoriesForSelect } from "@/lib/admin-data";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "../actions";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Editar producto" };

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin(); // layouts don't re-run on client navigation
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategoriesForSelect(),
  ]);
  if (!product) notFound();
  const isCombo = categories.find((c) => c.id === product.categoryId)?.slug === "combos";

  const action = updateProduct.bind(null, product.id);

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted hover:text-ink">
        ← Volver a productos
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{isCombo ? "Editar combo" : "Editar producto"}</h1>

      <div className="mt-6">
        <ProductForm
          action={action}
          categories={categories}
          product={product}
          isCombo={isCombo}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
