"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { AdminBranchRow } from "@/lib/admin-data";
import { createBranch, updateBranch } from "@/app/admin/(dashboard)/branches/actions";

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.2)] disabled:opacity-60";
const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-muted";

function Field({
  name,
  label,
  hint,
  placeholder,
  required,
  defaultValue,
  type = "text",
  step,
  span,
}: {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  type?: string;
  step?: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <label htmlFor={`br-${name}`} className={labelCls}>
        {label}
      </label>
      <input
        id={`br-${name}`}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={input}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-cream-soft px-3.5 py-2.5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function BranchForm({ branch, mode }: { branch?: AdminBranchRow; mode: "create" | "edit" }) {
  const action =
    mode === "edit" && branch ? updateBranch.bind(null, branch.id) : createBranch;
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      if (mode === "create") {
        toast.success("Sucursal creada", { title: "Guardado" });
        router.push("/admin/branches");
      } else {
        toast.success("Cambios guardados", { title: "Guardado" });
        router.refresh();
      }
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast, mode, router]);

  const text = (key: keyof AdminBranchRow, fallback = "") => {
    const saved = state.values?.[key];
    if (typeof saved === "string") return saved;
    const value = branch?.[key];
    return value == null ? fallback : String(value);
  };
  const flag = (key: "deliveryEnabled" | "pickupEnabled" | "active", fallback: boolean) => {
    const saved = state.values?.[key];
    return typeof saved === "boolean" ? saved : branch?.[key] ?? fallback;
  };

  return (
    <form
      key={state.values ? "error" : "initial"}
      action={formAction}
      className="space-y-6 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
    >
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Identificación</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Nombre de la sucursal" required defaultValue={text("name")} placeholder="Toby · Ventura Mall" />
          <Field
            name="code"
            label="Código"
            required
            defaultValue={text("code")}
            placeholder="TB01"
            hint="Se usa al inicio del número de pedido (p. ej. TB01-K7F2ZQ-8HGN3KP2)."
          />
          <Field name="slug" label="Slug (opcional)" defaultValue={text("slug")} placeholder="automático" />
          <Field name="sortOrder" label="Orden en la lista" type="number" defaultValue={text("sortOrder", "0")} hint="Menor número = aparece primero." />
        </div>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Ubicación y contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="address" label="Dirección" required defaultValue={text("address")} placeholder="Av. San Martín #123" />
          <Field name="city" label="Ciudad" required defaultValue={text("city")} placeholder="Santa Cruz" />
          <Field name="phone" label="Teléfono" defaultValue={text("phone")} placeholder="+591 700 00000" />
          <Field
            name="whatsapp"
            label="WhatsApp"
            defaultValue={text("whatsapp")}
            placeholder="59170000000"
            hint="Solo dígitos, formato internacional."
          />
          <Field name="hours" label="Horario" defaultValue={text("hours")} placeholder="Lunes a sábado · 8:00 a 22:00" span />
          <Field
            name="image"
            label="Foto de la sucursal"
            defaultValue={text("image")}
            placeholder="https://… o /imgs/sucursal.jpg"
            hint="Enlace https:// o ruta local que empiece por /."
            span
          />
          <Field
            name="mapsUrl"
            label="Enlace de Google Maps"
            defaultValue={text("mapsUrl")}
            placeholder="https://maps.app.goo.gl/…"
            span
          />
          <Field
            name="latitude"
            label="Latitud"
            type="number"
            step="any"
            defaultValue={text("latitude")}
            placeholder="-17.7833"
            hint="Opcional. Permite sugerir esta sucursal por geolocalización."
          />
          <Field
            name="longitude"
            label="Longitud"
            type="number"
            step="any"
            defaultValue={text("longitude")}
            placeholder="-63.1821"
            hint="Cópialas desde Google Maps (clic derecho → coordenadas)."
          />
        </div>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Entrega</h2>
        <p className="mt-1 text-sm text-muted">
          El costo y el umbral vacíos usan los ajustes generales de la tienda.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            name="flatFee"
            label="Costo de envío (Bs)"
            type="number"
            defaultValue={text("flatFee")}
            placeholder="General"
          />
          <Field
            name="freeThreshold"
            label="Envío gratis desde (Bs)"
            type="number"
            defaultValue={text("freeThreshold")}
            placeholder="General"
          />
          <Check
            name="deliveryEnabled"
            label="Entrega a domicilio"
            hint="El cliente puede pedir envío en esta sucursal."
            defaultChecked={flag("deliveryEnabled", true)}
          />
          <Check
            name="pickupEnabled"
            label="Retiro en tienda"
            hint="El cliente recoge su pedido en esta dirección."
            defaultChecked={flag("pickupEnabled", true)}
          />
          <div className="sm:col-span-2">
            <Check
              name="active"
              label="Sucursal activa"
              hint="Desactívala para ocultarla de la tienda y del selector de sucursal (conserva pedidos e inventario)."
              defaultChecked={flag("active", true)}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--line)] pt-5">
        <Link
          href="/admin/branches"
          className="rounded-lg border border-[var(--line-strong)] px-4 py-2.5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-strong"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60"
        >
          {pending ? "Guardando…" : mode === "create" ? "Crear sucursal" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
