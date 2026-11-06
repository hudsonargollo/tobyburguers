"use client";

import { useActionState, useEffect } from "react";
import type { StatusState } from "@/app/admin/(dashboard)/orders/actions";
import { useToast } from "@/components/ui/toast";

type Action = (prev: StatusState, formData: FormData) => Promise<StatusState>;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

const select =
  "w-full rounded-md border border-[var(--line-strong)] bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const saveBtn =
  "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60";

// Small client wrapper so status/payment updates give a toast on save.
export function StatusUpdateForm({
  action,
  name,
  defaultValue,
  options,
  successMessage,
}: {
  action: Action;
  name: string;
  defaultValue: string;
  options: readonly string[];
  successMessage: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();

  useEffect(() => {
    if (state.ok) toast.success(successMessage, { title: "Guardado" });
    else if (state.error) toast.error(state.error);
  }, [state, toast, successMessage]);

  return (
    <form action={formAction} className="flex gap-2">
      <select key={defaultValue} name={name} defaultValue={defaultValue} className={select} disabled={options.length <= 1}>
        {options.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s] ?? s}
          </option>
        ))}
      </select>
      <button disabled={pending || options.length <= 1} className={saveBtn} title={options.length <= 1 ? "Este estado es definitivo" : undefined}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
