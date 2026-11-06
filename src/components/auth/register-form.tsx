"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthState } from "@/app/(store)/auth-actions";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthAlert,
  AuthField,
  AuthSubmit,
  PasswordStrength,
  SecureNote,
  useAuthForm,
} from "@/components/auth/auth-field";
import { emailError, nameError, newPasswordError } from "@/lib/auth-rules";

const initial: AuthState = {};

const VALIDATE = { name: nameError, email: emailError, password: newPasswordError };

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initial);
  const [formRef, f] = useAuthForm(formAction, state, VALIDATE);
  const password = f.field("password");

  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Crear cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Únete a Toby ¡Mi Hamburguesa! para un pago más rápido. Te enviaremos un código para confirmar que eres tú.
        </p>
      </div>

      {next?.startsWith("/checkout") && (
        <p className="mt-5 rounded-xl border border-accent/50 bg-accent/10 px-3.5 py-3 text-center text-sm text-ink">
          Necesitas una cuenta para hacer tu pedido: toma un minuto y tu carrito se guarda.
        </p>
      )}

      <form ref={formRef} action={formAction} onSubmit={f.onSubmit} noValidate className="mt-7 space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
        <AuthField
          name="name"
          label="Nombre completo"
          icon="user"
          autoComplete="name"
          placeholder="Tu nombre"
          {...f.bind("name")}
          {...f.field("name")}
        />
        <AuthField
          name="email"
          label="Correo electrónico"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          {...f.bind("email")}
          {...f.field("email")}
        />
        <AuthField
          name="password"
          label="Contraseña"
          icon="lock"
          password
          autoComplete="new-password"
          placeholder="Crea una contraseña"
          {...f.bind("password")}
          {...password}
        >
          <PasswordStrength value={f.value("password")} highlight={password.status === "invalid"} />
        </AuthField>

        {state.error && <AuthAlert>{state.error}</AuthAlert>}

        <div>
          <AuthSubmit pending={pending} label="Continuar" pendingLabel="Enviando código…" />
          <SecureNote />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes una cuenta?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-accent-strong hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
