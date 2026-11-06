"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory } from "@/app/admin/(dashboard)/categories/actions";
import { useToast } from "@/components/ui/toast";

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.2)]";

export function AddCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, {});
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Categoría agregada", { title: "Guardado" });
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-muted">Nombre</label>
          <input name="name" required placeholder="Ej. Línea Premium" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-muted">Slug (opcional)</label>
          <input name="slug" placeholder="automático" className={input} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-muted">Descripción (opcional)</label>
        <input name="description" placeholder="Descripción breve" className={input} />
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700">Categoría agregada ✓</p>}
      <button
        disabled={pending}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar categoría"}
      </button>
    </form>
  );
}
