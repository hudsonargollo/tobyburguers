import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVerifiedAdmin } from "@/lib/admin";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Acceso al panel",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const SIGNED_OUT: Record<string, string> = {
  replaced: "Tu sesión se cerró porque esta cuenta de administrador inició sesión en otro dispositivo.",
  db: "Tu sesión se cerró porque no se pudo acceder a la base de datos. Inicia sesión de nuevo.",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  // Already signed in? Go straight to the dashboard.
  const session = await getVerifiedAdmin();
  if (session) redirect("/admin");

  const sp = await searchParams;
  const why = Array.isArray(sp.signed_out) ? sp.signed_out[0] : sp.signed_out;
  return <AdminLoginForm notice={why ? SIGNED_OUT[why] : undefined} />;
}
