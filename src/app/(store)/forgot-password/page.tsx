import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
