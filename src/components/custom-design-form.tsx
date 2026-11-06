"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { sendCustomRequest, type InboundState } from "@/app/(store)/inbound-actions";
import { PIECE_TYPES, FINISHES, BUDGETS } from "@/lib/custom-request";
import { CUSTOM_VALIDATORS } from "@/lib/inbound-rules";
import { useToast } from "@/components/ui/toast";
import { ReferencePhotos } from "@/components/reference-photos";
import { AuthAlert, useAuthForm } from "@/components/auth/auth-field";
import { Field, bindControl, fieldControl as control, phoneChars } from "@/components/form/validated-field";

const initial: InboundState = {};

export function CustomDesignForm({ whatsappUrl }: { whatsappUrl?: string }) {
  const [state, formAction, pending] = useActionState(sendCustomRequest, initial);
  const [formRef, f] = useAuthForm(formAction, state, CUSTOM_VALIDATORS);
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success("Nuestro equipo te contactará lo antes posible para coordinar disponibilidad, opciones y precio.", { title: "Pedido recibido" });
  }, [state, toast]);

  const bind = (name: string, filter?: (v: string) => string) => bindControl(f, name, filter);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/5 px-6 py-12 text-center">
        <h3 className="font-display text-2xl font-semibold text-ink">¡Gracias! Recibimos tu pedido.</h3>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Nuestro equipo revisará tu pedido y te contactará lo antes posible para coordinar disponibilidad, opciones y precio.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full border border-[var(--line-strong)] px-7 py-2.5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-strong"
        >
          Explora el menú mientras tanto
        </Link>
      </div>
    );
  }

  const select = (name: string, label: string, options: readonly string[]) => (
    <Field label={label} {...f.field(name)}>
      {(a11y) => (
        <select {...a11y} {...bind(name)} className={`${control} cursor-pointer`}>
          <option value="" disabled>Elegir…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </Field>
  );

  return (
    <form ref={formRef} action={formAction} onSubmit={f.onSubmit} noValidate className="space-y-5">
      {/* Honeypot for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tu nombre" hint="5–10 letras (A–Z)" {...f.field("name")}>
          {(a11y) => <input {...a11y} {...bind("name")} autoComplete="name" maxLength={20} placeholder="Ej. María" className={control} />}
        </Field>
        <Field label="Correo" {...f.field("email")}>
          {(a11y) => (
            <input {...a11y} {...bind("email")} type="email" autoComplete="email" spellCheck={false} placeholder="tu@correo.com" className={control} />
          )}
        </Field>
        <Field label="Teléfono / WhatsApp" hint="Ej. 700 00000 o +591…" {...f.field("phone")}>
          {(a11y) => (
            <input {...a11y} {...bind("phone", phoneChars)} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="700 00000" className={control} />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {select("pieceType", "¿Qué necesitas?", PIECE_TYPES)}
        {select("finish", "Formato", FINISHES)}
        {select("budget", "Presupuesto", BUDGETS)}
      </div>

      <Field label="¿Para cuándo? (opcional)" {...f.field("neededBy")}>
        {(a11y) => <input {...a11y} {...bind("neededBy")} maxLength={60} placeholder="Ej. 15 de diciembre, o flexible" className={control} />}
      </Field>

      <Field label="Cuéntanos tu pedido" multiline {...f.field("details")}>
        {(a11y) => (
          <textarea
            {...a11y}
            {...bind("details")}
            rows={5}
            maxLength={3000}
            placeholder="Cuéntanos qué necesitas — cuántas personas, qué combos te gustarían y para cuándo…"
            className={`${control} resize-y`}
          />
        )}
      </Field>

      <ReferencePhotos resyncKey={state} whatsappUrl={whatsappUrl} />

      {state.error && <AuthAlert>{state.error}</AuthAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Coordinaremos contigo disponibilidad, opciones y precio.</p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-9 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar pedido"}
        </button>
      </div>
    </form>
  );
}
