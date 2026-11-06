"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessBranch } from "@/lib/admin";
import { refreshCatalog } from "@/lib/cache-tags";

const MAX_STOCK = 1_000_000;

export async function setBranchStock(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const raw = Number(formData.get("stock"));
  if (!productId || !branchId || !canAccessBranch(session, branchId)) return;
  const stock = Number.isFinite(raw) ? Math.min(MAX_STOCK, Math.max(0, Math.floor(raw))) : 0;

  try {
    await prisma.branchStock.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, stock },
      update: { stock },
    });
  } catch (err) {
    console.error("[inventory] could not save stock:", err);
    return;
  }
  refreshCatalog();
  revalidatePath("/admin/inventory");
}

/** Hide/show a product for one branch without touching the shared catalog. */
export async function setBranchProductActive(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const active = formData.get("active") === "1";
  if (!productId || !branchId || !canAccessBranch(session, branchId)) return;

  try {
    await prisma.branchStock.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, stock: 0, active },
      update: { active },
    });
  } catch (err) {
    console.error("[inventory] could not change availability:", err);
    return;
  }
  refreshCatalog();
  revalidatePath("/admin/inventory");
}
