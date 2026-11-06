"use client";

import { useActionState, useEffect } from "react";
import { sendContactMessage, type InboundState } from "@/app/(store)/inbound-actions";
import { CONTACT_VALIDATORS } from "@/lib/inbound-rules";
import { useToast } from "@/components/ui/toast";
import { AuthAlert, useAuthForm } from "@/components/auth/auth-field";
import { Field, bindControl, fieldControl as control, phoneChars } from "@/components/form/validated-field";

const initial: InboundState = {};

export function ContactForm({ topic, defaultSubject }: { topic?: string; defaultSubject?: string }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, initial);
  const [formRef, f] = useAuthForm(formAction, state, CONTACT_VALIDATORS, {
    initial: defaultSubject ? { subject: defaultSubject } : {},
  });
  const bind = (name: string, filter?: (v: string) => string) => bindControl(f, name, filter);
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success("Te responderemos pronto.", { title: "Mensaje enviado" });
  }, [state, toast]);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--line)] bg-cream-soft p-10 text-center">
        <h2 className="font-display text-2xl font-semibold text-ink">¡Gracias por escribirnos!</h2>
        <p className="mt-2 text-muted">Recibimos tu mensaje. Te responderemos pronto.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={f.onSubmit} noValidate className="space-y-4">
      {topic && <input type="hidden" name="topic" value={topic} />}
      {/* Honeypot for bots — hidden from people and screen readers */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tu nombre" hint="5–10 letras (A–Z)" {...f.field("name")}>
          {(a11y) => <input {...a11y} {...bind("name")} autoComplete="name" maxLength={20} placeholder="Ej. María" className={control} />}
        </Field>
        <Field label="Correo" {...f.field("email")}>
          {(a11y) => (
            <input {...a11y} {...bind("email")} type="email" autoComplete="email" spellCheck={false} placeholder="tu@correo.com" className={control} />
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono (opcional)" hint="Ej. 700 00000 o +591…" {...f.field("phone")}>
          {(a11y) => (
            <input {...a11y} {...bind("phone", phoneChars)} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="700 00000" className={control} />
          )}
        </Field>
        <Field label="Asunto (opcional)" {...f.field("subject")}>
          {(a11y) => <input {...a11y} {...bind("subject")} maxLength={200} placeholder="¿De qué se trata?" className={control} />}
        </Field>
      </div>
      <Field label="Tu mensaje" multiline {...f.field("message")}>
        {(a11y) => (
          <textarea {...a11y} {...bind("message")} rows={5} maxLength={5000} placeholder="¿En qué te ayudamos?" className={`${control} resize-y`} />
        )}
      </Field>
      {state.error && <AuthAlert>{state.error}</AuthAlert>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-9 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
