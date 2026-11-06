"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/admin";
import { startSession, endSession } from "@/lib/auth";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";

export type LoginState = { error?: string; values?: { email: string } };

export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  // Keep the email after a failed attempt (React 19 resets the form).
  return { ...(await login(prev, formData)), values: { email: String(formData.get("email") ?? "") } };
}

async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const key = email.trim().toLowerCase();
  if (!rateLimit(`admin-login:${await clientIp()}`, 10, 15 * 60_000) || !rateLimit(`admin-login:${key}`, 5, 15 * 60_000)) {
    return { error: TOO_MANY };
  }

  const res = await verifyCredentials(email, password);
  if (!res.ok) {
    return {
      error:
        res.reason === "db"
          ? "No puedo acceder a la base de datos ahora, no puedes iniciar sesión. Intenta de nuevo en un minuto."
          : "Correo o contraseña incorrectos.",
    };
  }

  await startSession(key, res.role, res.ver, res.branchId);
  redirect("/admin?flash=admin-login");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
