"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import type { AdminProductDetail } from "@/lib/admin-data";
import { useToast } from "@/components/ui/toast";

type Action = (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export function ProductForm({
  action,
  categories,
  product,
  submitLabel,
  isCombo = false,
}: {
  action: Action;
  categories: { id: string; name: string }[];
  product?: AdminProductDetail;
  submitLabel: string;
  isCombo?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values; // what the admin typed, kept after a failed save
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <Row label="Nombre" required>
        <input name="name" required defaultValue={v?.name ?? product?.name} className={input} />
      </Row>
      <Row label="Slug" hint="Déjalo en blanco para generarlo automáticamente a partir del nombre">
        <input name="slug" defaultValue={v?.slug ?? product?.slug} className={input} placeholder="automático" />
      </Row>
      <Row label={isCombo ? "Qué incluye el combo" : "Descripción"} required={isCombo}>
        <textarea name="description" rows={4} required={isCombo} defaultValue={v?.description ?? product?.description ?? ""} className={input} placeholder={isCombo ? "Ej. Hamburguesa + papas fritas + gaseosa" : undefined} />
      </Row>

      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Precio (Bs)" required>
          <input name="price" type="number" min="0" step="1" required defaultValue={v?.price ?? product?.price} className={input} />
        </Row>
        <Row label="Precio anterior (Bs)" hint="Opcional: se muestra tachado">
          <input name="compareAtPrice" type="number" min="0" step="1" defaultValue={v?.compareAtPrice ?? product?.compareAtPrice ?? ""} className={input} />
        </Row>
        <Row label="SKU">
          <input name="sku" defaultValue={v?.sku ?? product?.sku ?? ""} className={input} />
        </Row>
        <Row label="Presentación">
          <input name="material" defaultValue={v?.material ?? product?.material ?? ""} className={input} placeholder="Ej. Botella 1 L" />
        </Row>
        {isCombo ? (
          <input type="hidden" name="categoryId" value={product?.categoryId ?? "combos"} />
        ) : (
          <Row label="Categoría" required>
            <select key={v?.categoryId ?? "init"} name="categoryId" required defaultValue={v?.categoryId ?? product?.categoryId ?? ""} className={input}>
              <option value="" disabled>
                Elige una categoría
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Row>
        )}
      </div>

      <Row
        label="Especificaciones"
        hint={'Una por línea con el formato «Etiqueta: Valor». Se muestran en la tabla de destacados y especificaciones de la página del producto.'}
      >
        <textarea
          name="specs"
          rows={6}
          defaultValue={v?.specs ?? product?.specs ?? ""}
          className={input}
          placeholder={`Presentación: 1 persona\nCorte: Pecho o pierna\nAcompañamiento: Papas fritas, arroz y plátano\nBebida: Soda 500 ml`}
        />
      </Row>

      <Row label="Imágenes del producto" hint="Sube desde tu dispositivo: la primera imagen es la principal.">
        <ImageUploader initial={product?.images ?? []} />
      </Row>

      {isCombo && !product && (
        <Row label="Stock inicial por sucursal" hint="Unidades del combo completo en cada sucursal activa. Luego puedes ajustarlas por sucursal en Inventario; no se descuenta stock de sus componentes.">
          <input name="initialStock" type="number" min="0" max="100000" step="1" defaultValue={v?.initialStock ?? 0} className={input} />
        </Row>
      )}
      {isCombo && product && (
        <p className="text-sm text-muted">Gestiona las unidades del combo por sucursal desde <Link href="/admin/inventory" className="underline">Inventario</Link>.</p>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="featured" defaultChecked={v ? v.featured === "on" : product?.featured} className="accent-[var(--color-accent-strong)]" />
          Destacado
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="active" defaultChecked={v ? v.active === "on" : product?.active ?? !isCombo} className="accent-[var(--color-accent-strong)]" />
          {isCombo ? "Publicar en el menú" : "Activo (visible en la tienda)"}
        </label>
      </div>

      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-deep shadow-[0_14px_32px_-16px_rgba(232,190,26,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-soft disabled:opacity-60"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/admin/products" className="text-sm text-muted hover:text-ink">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.2)]";

function ImageUploader({ initial }: { initial: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setErr(null);
    setBusy(true);
    for (const f of list) {
      try {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Error al subir");
        setUrls((prev) => [...prev, d.url]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Error al subir");
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(u: string) {
    setUrls((prev) => prev.filter((x) => x !== u));
  }
  function move(u: string, dir: -1 | 1) {
    setUrls((prev) => {
      const i = prev.indexOf(u);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div>
      {/* value sent to the server action (unchanged contract: newline-joined) */}
      <input type="hidden" name="images" value={urls.join("\n")} />

      {urls.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((u, i) => (
            <div key={u} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-sand">
              <img src={u} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-light">
                  Principal
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/45 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(u, -1)} disabled={i === 0} className="text-light disabled:opacity-30" aria-label="Mover a la izquierda">‹</button>
                  <button type="button" onClick={() => move(u, 1)} disabled={i === urls.length - 1} className="text-light disabled:opacity-30" aria-label="Mover a la derecha">›</button>
                </div>
                <button type="button" onClick={() => remove(u)} className="text-light hover:text-red-300" aria-label="Quitar">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition ${
          drag ? "border-accent bg-accent/10" : "border-[var(--line-strong)] bg-surface hover:border-accent"
        }`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="text-sm text-ink">
          {busy ? "Subiendo…" : "Haz clic para subir o arrastra las imágenes"}
        </p>
        <p className="text-xs text-muted">JPG, PNG, WEBP · hasta 5 MB cada una</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function Row({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
