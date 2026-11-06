"use client";

import { useActionState, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import type { OtpState } from "@/app/(store)/auth-actions";
import { useToast } from "@/components/ui/toast";

type Action = (prev: OtpState, fd: FormData) => Promise<OtpState>;

const LENGTH = 6;

const boxCls =
  "h-14 w-11 rounded-xl border border-[var(--line-strong)] bg-surface text-center font-display text-2xl font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.3)] disabled:opacity-60 sm:h-16 sm:w-12";

const submitBtn =
  "w-full rounded-full bg-gradient-to-r from-accent-soft via-accent to-accent-strong px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-brand-deep shadow-[0_16px_36px_-14px_rgba(232,190,26,0.75)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60";

export function OtpForm({
  maskedEmail,
  verifyAction,
  resendAction,
  initialWait,
  changeHref,
  changeLabel,
}: {
  maskedEmail: string;
  verifyAction: Action;
  resendAction: Action;
  initialWait: number;
  changeHref: string;
  changeLabel: string;
}) {
  const [state, formAction, pending] = useActionState(verifyAction, {});
  const [resendState, resendFormAction, resending] = useActionState(resendAction, {});
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [wait, setWait] = useState(initialWait);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  // Countdown for "Resend code"
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // New action results adjust local state during render (React's recommended
  // pattern instead of setState inside an effect).
  const [seenVerify, setSeenVerify] = useState(state);
  if (state !== seenVerify) {
    setSeenVerify(state);
    if (state.error) setDigits(Array(LENGTH).fill(""));
  }
  const [seenResend, setSeenResend] = useState(resendState);
  if (resendState !== seenResend) {
    setSeenResend(resendState);
    if (resendState.ok) setDigits(Array(LENGTH).fill(""));
    if (resendState.retryAfter) setWait(resendState.retryAfter);
  }

  // Side effects only: toasts + refocus the first box (success redirects).
  const lastVerify = useRef(state);
  useEffect(() => {
    if (state === lastVerify.current) return;
    lastVerify.current = state;
    if (state.error) {
      toast.error(state.error);
      inputs.current[0]?.focus();
    }
  }, [state, toast]);

  const lastResend = useRef(resendState);
  useEffect(() => {
    if (resendState === lastResend.current) return;
    lastResend.current = resendState;
    if (resendState.ok) {
      toast.success(resendState.message ?? "Código reenviado.", { title: "Revisa tu correo" });
      inputs.current[0]?.focus();
    } else if (resendState.error) toast.error(resendState.error);
  }, [resendState, toast]);

  const code = digits.join("");

  const fill = (start: number, chars: string) => {
    const next = [...digits];
    let i = start;
    for (const ch of chars.replace(/\D/g, "").slice(0, LENGTH - start)) next[i++] = ch;
    setDigits(next);
    inputs.current[Math.min(i, LENGTH - 1)]?.focus();
    // Auto-submit once all six digits are in.
    if (next.every(Boolean)) requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  };

  return (
    <div>
      <p className="text-center text-sm text-muted">
        Enviamos un código de 6 dígitos a <span className="font-medium text-ink">{maskedEmail}</span>. Ingrésalo
        abajo; vence en 10 minutos.
      </p>

      <form ref={formRef} action={formAction} className="mt-7 space-y-5">
        <input type="hidden" name="code" value={code} />
        <div className="flex justify-center gap-2 sm:gap-2.5" role="group" aria-label="Código de verificación">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (!v) {
                  const next = [...digits];
                  next[i] = "";
                  setDigits(next);
                } else fill(i, v);
              }}
              onKeyDown={(e) => onKey(i, e)}
              onPaste={(e) => onPaste(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              autoFocus={i === 0}
              disabled={pending}
              aria-label={`Dígito ${i + 1}`}
              className={boxCls}
            />
          ))}
        </div>

        {state.error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">{state.error}</p>
        )}

        <button type="submit" disabled={pending || code.length < LENGTH} className={submitBtn}>
          {pending ? "Verificando…" : "Verificar y continuar"}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted">
        <form action={resendFormAction}>
          {wait > 0 ? (
            <span>
              ¿No lo recibiste? Podrás reenviar en <span className="font-medium text-ink tabular-nums">{wait}s</span>
            </span>
          ) : (
            <button type="submit" disabled={resending} className="font-medium text-accent-strong hover:underline disabled:opacity-60">
              {resending ? "Enviando…" : "Reenviar código"}
            </button>
          )}
        </form>
        <p className="text-xs">Revisa también las carpetas de spam o promociones.</p>
        <Link href={changeHref} className="text-xs text-accent-strong hover:underline">
          {changeLabel}
        </Link>
      </div>
    </div>
  );
}
