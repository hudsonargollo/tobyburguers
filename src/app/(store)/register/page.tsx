import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession, safeNext } from "@/lib/customer-auth";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await getCustomerSession()) redirect(next);
  return <RegisterForm next={next} />;
}
