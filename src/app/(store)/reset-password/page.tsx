import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = (Array.isArray(sp.token) ? sp.token[0] : sp.token) ?? "";
  return <ResetPasswordForm token={token} />;
}
