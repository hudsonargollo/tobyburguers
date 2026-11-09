"use client";

import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { deleteReward, saveLoyaltyRules, saveReward, adjustCustomer, type LoyaltyState } from "@/app/admin/(dashboard)/loyalty/actions";
import type { LoyaltySettings } from "@/lib/settings-shared";

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.2)] disabled:opacity-60";
const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-muted";
const saveBtn =
  "rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60";

type Action = (prev: LoyaltyState, fd: FormData) => Promise<LoyaltyState>;

/** Same card shell as Admin → Ajustes: form + toast on success. */
function Card({
  id,
  title,
  description,
  action,
  success,
  disabled,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action: Action;
  success: string;
  disabled?: boolean;
  children: (state: LoyaltyState) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();

  useEffect(() => {
    if (state.ok) toast.success(success, { title: "Guardado" });
    else if (state.error) toast.error(state.error);
  }, [state, toast, success]);

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
    >
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <form action={formAction} className="mt-5 space-y-4">
        <fieldset disabled={disabled || pending} className="space-y-4">
          {children(state)}
        </fieldset>
        {state.error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {!disabled && (
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className={saveBtn}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function Num({
  name,
  label,
  hint,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: number;
  min?: number;
  max?: number;
}) {
  // Rewards render this many times per page, so the id has to be per-instance.
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        defaultValue={defaultValue}
        min={min}
        max={max}
        className={input}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------- Rules ----------
export function LoyaltyRulesForm({
  rules,
  categories,
  products,
  canEdit,
}: {
  rules: LoyaltySettings;
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
  canEdit: boolean;
}) {
  const [mode, setMode] = useState(rules.eligible);
  return (
    <Card
      id="reglas"
      title="Reglas del programa"
      description="Se aplican a la tienda, al checkout y a la página del club al instante."
      action={saveLoyaltyRules}
      success="Reglas actualizadas."
      disabled={!canEdit}
    >
      {(state) => (
        <>
          <label className="flex items-start gap-3 rounded-lg border border-[var(--line-strong)] px-4 py-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={rules.enabled}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent-strong)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Programa activo</span>
              <span className="block text-xs text-muted">
                Al pausarlo se ocultan la página del club, los sellos en el checkout y el canje de regalos.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="loy-name" className={labelCls}>
                Nombre del programa
              </label>
              <input
                id="loy-name"
                name="name"
                defaultValue={state.values?.name ?? rules.name}
                maxLength={40}
                className={input}
              />
              <p className="mt-1 text-xs text-muted">Aparece en el menú, el pie y la página del club.</p>
            </div>
            <Num
              name="stampsToFree"
              label="Sellos para un producto gratis"
              defaultValue={rules.stampsToFree}
              min={1}
              max={100}
              hint="10 = «cada 10 sellos, 1 gratis»."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Num
              name="pointsPer"
              label="Puntos por cada bloque de gasto"
              defaultValue={rules.pointsPer}
              min={0}
              hint="0 puntos pausa la tienda de regalos sin borrar saldos."
            />
            <Num
              name="pointsAmount"
              label="Bs de gasto que otorgan esos puntos"
              defaultValue={rules.pointsAmount}
              min={1}
              hint="Ej. 1 sello por unidad + 1 punto cada Bs 10."
            />
            <Num
              name="expiryDays"
              label="Días de validez"
              defaultValue={rules.expiryDays}
              min={0}
              max={3650}
              hint="0 = sellos y puntos no vencen nunca."
            />
            <label className="flex items-center gap-3 self-end rounded-lg border border-[var(--line-strong)] px-4 py-2.5">
              <input
                type="checkbox"
                name="pointsOnShipping"
                defaultChecked={rules.pointsOnShipping}
                className="h-4 w-4 accent-[var(--color-accent-strong)]"
              />
              <span className="text-sm text-ink">El delivery también suma puntos</span>
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className={labelCls}>¿Qué productos suman sellos?</legend>
            {(["all", "category", "product"] as const).map((value) => (
              <label key={value} className="flex items-center gap-3 text-sm text-ink">
                <input
                  type="radio"
                  name="eligible"
                  value={value}
                  defaultChecked={rules.eligible === value}
                  onChange={() => setMode(value)}
                  className="h-4 w-4 accent-[var(--color-accent-strong)]"
                />
                {value === "all"
                  ? "Todo el menú"
                  : value === "category"
                    ? "Solo estas categorías"
                    : "Solo estos productos"}
              </label>
            ))}

            {mode === "category" && (
              <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-[var(--line)] p-3 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="eligibleSlugs"
                      value={c.slug}
                      defaultChecked={rules.eligibleSlugs.includes(c.slug)}
                      className="h-4 w-4 accent-[var(--color-accent-strong)]"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
            {mode === "product" && (
              <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-[var(--line)] p-3 sm:grid-cols-2">
                {products.map((p) => (
                  <label key={p.slug} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="eligibleSlugs"
                      value={p.slug}
                      defaultChecked={rules.eligibleSlugs.includes(p.slug)}
                      className="h-4 w-4 accent-[var(--color-accent-strong)]"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </>
      )}
    </Card>
  );
}

// ---------- Rewards ----------
export type RewardRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  costPoints: number;
  stock: number;
  active: boolean;
  order: number;
};

export function RewardForm({ reward, canEdit }: { reward?: RewardRow; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const isNew = !reward;
  if (!canEdit && reward) {
    return null;
  }
  return (
    <details
      open={open || isNew}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border border-[var(--line-strong)] bg-cream-soft/60 p-4"
    >
      <summary className="cursor-pointer text-sm font-medium text-ink">
        {isNew ? "Nuevo regalo" : reward!.name}
      </summary>
      <div className="mt-4">
        <Card
          id={`regalo-${reward?.id ?? "nuevo"}`}
          title={isNew ? "Añadir regalo" : "Editar regalo"}
          description="Los regalos se canjean con puntos en la página del club."
          action={saveReward}
          success="Regalo guardado."
          disabled={!canEdit}
        >
          {(state) => (
            <>
              <input type="hidden" name="id" value={reward?.id ?? ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`n-${reward?.id ?? "new"}`} className={labelCls}>
                    Nombre
                  </label>
                  <input
                    id={`n-${reward?.id ?? "new"}`}
                    name="name"
                    defaultValue={state.values?.name ?? reward?.name ?? ""}
                    maxLength={80}
                    className={input}
                  />
                </div>
                <div>
                  <label htmlFor={`i-${reward?.id ?? "new"}`} className={labelCls}>
                    Imagen (opcional)
                  </label>
                  <input
                    id={`i-${reward?.id ?? "new"}`}
                    name="image"
                    defaultValue={state.values?.image ?? reward?.image ?? ""}
                    placeholder="/uploads/… o https://…"
                    className={input}
                  />
                </div>
                <Num
                  name="costPoints"
                  label="Puntos"
                  defaultValue={reward?.costPoints ?? 200}
                  min={1}
                />
                <Num name="stock" label="Unidades disponibles" defaultValue={reward?.stock ?? 10} min={0} />
                <Num name="order" label="Orden de aparición" defaultValue={reward?.order ?? 0} min={0} />
              </div>
              <div>
                <label htmlFor={`d-${reward?.id ?? "new"}`} className={labelCls}>
                  Descripción (opcional)
                </label>
                <textarea
                  id={`d-${reward?.id ?? "new"}`}
                  name="description"
                  rows={2}
                  maxLength={240}
                  defaultValue={state.values?.description ?? reward?.description ?? ""}
                  className={input}
                />
              </div>
              {reward && (
                <DeleteRewardButton
                  id={reward.id}
                  name={reward.name}
                  onDone={() => setOpen(false)}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </details>
  );
}

function DeleteRewardButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`¿Borrar "${name}" del catálogo de regalos?`)) return;
        const res = await deleteReward(id);
        if (res.ok) {
          toast.success("Regalo borrado.");
          onDone();
          window.location.reload();
        } else toast.error(res.error ?? "No se pudo borrar.");
      }}
      className="text-sm text-red-700 transition hover:underline"
    >
      Borrar este regalo
    </button>
  );
}

// ---------- Manual balance correction ----------
export function AdjustForm({
  customerId,
  products,
  canEdit,
}: {
  customerId: string;
  products: { id: string; name: string }[];
  canEdit: boolean;
}) {
  return (
    <Card
      id={`ajuste-${customerId}`}
      title="Ajuste manual"
      description="Regala sellos o puntos, o corrige un error. Cada ajuste queda registrado con tu nota."
      action={adjustCustomer}
      success="Ajuste registrado."
      disabled={!canEdit}
    >
      {() => (
        <>
          <input type="hidden" name="customerId" value={customerId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Num name="stamps" label="Sellos (+/-)" defaultValue={0} min={-1000} max={1000} />
            <Num name="points" label="Puntos (+/-)" defaultValue={0} min={-100000} max={100000} />
          </div>
          <div>
            <label htmlFor={`p-${customerId}`} className={labelCls}>
              Producto de los sellos (opcional)
            </label>
            <select id={`p-${customerId}`} name="productId" defaultValue="" className={input}>
              <option value="">Sin producto (ajuste general)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Los sellos pertenecen a un producto: cada tarjeta canjea ese mismo producto gratis.
            </p>
          </div>
          <div>
            <label htmlFor={`note-${customerId}`} className={labelCls}>
              Motivo
            </label>
            <input
              id={`note-${customerId}`}
              name="note"
              required
              maxLength={200}
              placeholder="Ej. Reposición por pedido perdido"
              className={input}
            />
          </div>
        </>
      )}
    </Card>
  );
}
