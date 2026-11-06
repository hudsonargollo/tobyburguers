"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/(store)/auth-actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthAlert, AuthField, AuthSubmit, SecureNote, useAuthForm } from "@/components/auth/auth-field";
import { emailError } from "@/lib/auth-rules";

const initial: AuthState = {};

const VALIDATE = {
  email: emailError,
  password: (v: string) => (v ? null : "Ingresa tu contraseña"),
};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [formRef, f] = useAuthForm(formAction, state, VALIDATE, { clearOnError: ["password"] });
  const email = f.field("email");
  const password = f.field("password", { positive: false });

  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Hola de nuevo</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión para seguir comprando.</p>
      </div>

      {next?.startsWith("/checkout") && (
        <p className="mt-5 rounded-xl border border-accent/50 bg-accent/10 px-3.5 py-3 text-center text-sm text-ink">
          Inicia sesión o crea una cuenta gratis para realizar tu pedido — tu carrito se guarda.
        </p>
      )}

      <form ref={formRef} action={formAction} onSubmit={f.onSubmit} noValidate className="mt-7 space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
        <AuthField
          name="email"
          label="Correo electrónico"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          {...f.bind("email")}
          {...email}
        />
        <AuthField
          name="password"
          label="Contraseña"
          icon="lock"
          password
          autoComplete="current-password"
          placeholder="Tu contraseña"
          {...f.bind("password")}
          labelAside={
            <Link href="/forgot-password" className="text-xs font-medium text-accent-strong hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          }
          {...password}
        />

        {state.error && <AuthAlert>{state.error}</AuthAlert>}

        <div>
          <AuthSubmit pending={pending} label="Iniciar sesión" pendingLabel="Iniciando sesión…" />
          <SecureNote />
        </div>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
        <span className="h-px flex-1 bg-[var(--line)]" />
        ¿Primera vez en Toby?
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <Link
        href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
        className="mt-4 block rounded-full border border-accent/60 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-accent-strong transition hover:border-accent hover:bg-accent/10"
      >
        Crear una cuenta
      </Link>
    </AuthShell>
  );
}
