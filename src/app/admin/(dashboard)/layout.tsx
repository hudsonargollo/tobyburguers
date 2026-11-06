import { requireAdmin } from "@/lib/admin";
import { getBranchById } from "@/lib/branch";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Toby ¡Mi Hamburguesa!" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const branchName = session.branchId
    ? (await getBranchById(session.branchId))?.name ?? null
    : null;

  return (
    <AdminShell email={session.email} role={session.role} branchName={branchName}>
      {children}
    </AdminShell>
  );
}
