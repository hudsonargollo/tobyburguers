"use client";

import { useActionState, useEffect } from "react";
import { loginAction, type LoginState } from "@/app/admin/login/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { useToast } from "@/components/ui/toast";

const initial: LoginState = {};

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.22)]";

const label = "mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted";

const submitBtn =
  "w-full rounded-full bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft disabled:opacity-60";

export function AdminLoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <AuthShell backHref="/" backLabel="Volver a la tienda" eyebrow="Panel de gestión">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Acceso al panel</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión en el panel de gestión.</p>
      </div>

      {notice && !state.error && (
        <p role="status" className="mt-6 flex items-start gap-2.5 rounded-xl border border-accent/50 bg-accent/10 px-3.5 py-3 text-sm text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="mt-px h-[1.1rem] w-[1.1rem] shrink-0 text-accent-strong" aria-hidden="true">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </svg>
          <span>{notice}</span>
        </p>
      )}

      <form action={formAction} className="mt-7 space-y-4">
        <div>
          <label className={label}>Correo electrónico</label>
          <input name="email" type="email" required autoComplete="username" placeholder="tu@ejemplo.com" defaultValue={state.values?.email} className={input} />
        </div>
        <div>
          <label className={label}>Contraseña</label>
          <PasswordInput name="password" required autoComplete="current-password" className={input} />
        </div>

        {state.error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button type="submit" disabled={pending} className={submitBtn}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Solo personal autorizado · Toby ¡Mi Hamburguesa!
      </p>
    </AuthShell>
  );
}
