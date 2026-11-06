import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession, safeNext } from "@/lib/customer-auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  // Already signed in? Skip the form.
  if (await getCustomerSession()) redirect(next);
  return <LoginForm next={next} />;
}
