"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import type { StoreSettings } from "@/lib/settings-shared";
import {
  saveContactSettings,
  saveSocialSettings,
  saveShippingSettings,
  saveAnnouncementSettings,
  saveAlertSettings,
  changePassword,
  addTeamMember,
  type SettingsState,
} from "@/app/admin/(dashboard)/settings/actions";

type Action = (prev: SettingsState, fd: FormData) => Promise<SettingsState>;

const input =
  "w-full rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(232,190,26,0.2)] disabled:opacity-60";
const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-muted";
const saveBtn =
  "rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft disabled:opacity-60";

/** One settings card: a form wired to a server action with toast feedback. */
function Card({
  id,
  title,
  description,
  action,
  success,
  disabled,
  resetOnSuccess,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action: Action;
  success: string;
  disabled?: boolean;
  resetOnSuccess?: boolean;
  children: (state: SettingsState) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(success, { title: "Guardado" });
      if (resetOnSuccess) formRef.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state, toast, success, resetOnSuccess]);

  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <form ref={formRef} action={formAction} className="mt-5 space-y-4">
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

function Field({
  name,
  label,
  hint,
  defaultValue,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | number;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = `set-${name}`;
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={input}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StoreSettingsForms({ settings, canEdit }: { settings: StoreSettings; canEdit: boolean }) {
  const v = (state: SettingsState, key: string, fallback: string | number) => state.values?.[key] ?? fallback;
  const lock = !canEdit;

  return (
    <>
      <Card
        id="contact"
        title="Contacto de la tienda"
        description="Se muestra en el pie de página, la página de contacto y el chat de soporte. Deja un campo vacío para ocultarlo."
        action={saveContactSettings}
        success="Datos de contacto actualizados"
        disabled={lock}
      >
        {(s) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="email" label="Correo electrónico" type="email" defaultValue={v(s, "email", settings.contact.email)} placeholder="ventas@toby.clubemkt.digital" />
            <Field name="phone" label="Teléfono" defaultValue={v(s, "phone", settings.contact.phone)} placeholder="+591 700 00000" />
            <Field
              name="whatsapp"
              label="Número de WhatsApp"
              defaultValue={v(s, "whatsapp", settings.contact.whatsapp)}
              placeholder="59170000000"
              hint="Formato internacional, solo dígitos. Activa el icono de WhatsApp y el botón de chat."
            />
            <Field name="city" label="Ciudad / dirección" defaultValue={v(s, "city", settings.contact.city)} placeholder="Santa Cruz, Bolivia" />
            <div className="sm:col-span-2">
              <Field name="hours" label="Horario de atención" defaultValue={v(s, "hours", settings.contact.hours)} placeholder="Lunes a sábado · 8:00 a 20:00" />
            </div>
          </div>
        )}
      </Card>

      <Card
        id="social"
        title="Redes sociales"
        description="Iconos del pie de página y el botón «Síguenos» de la página de inicio. Usa el enlace completo con https://; vacío = oculto."
        action={saveSocialSettings}
        success="Redes sociales actualizadas"
        disabled={lock}
      >
        {(s) => (
          <div className="grid gap-4">
            <Field name="instagram" label="Instagram" defaultValue={v(s, "instagram", settings.social.instagram)} placeholder="https://www.instagram.com/…" />
            <Field name="facebook" label="Facebook" defaultValue={v(s, "facebook", settings.social.facebook)} placeholder="https://www.facebook.com/…" />
            <Field name="tiktok" label="TikTok" defaultValue={v(s, "tiktok", settings.social.tiktok)} placeholder="https://www.tiktok.com/@…" />
          </div>
        )}
      </Card>

      <Card
        id="shipping"
        title="Envío y entrega"
        description="Se usa al pagar (el total del pedido se calcula con estos) y en las páginas de envío, FAQ y producto."
        action={saveShippingSettings}
        success="Ajustes de envío actualizados"
        disabled={lock}
      >
        {(s) => (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="flatFee" label="Costo de envío (Bs)" type="number" defaultValue={v(s, "flatFee", settings.shipping.flatFee)} required />
            <Field
              name="freeThreshold"
              label="Envío gratis desde (Bs)"
              type="number"
              defaultValue={v(s, "freeThreshold", settings.shipping.freeThreshold)}
              required
              hint="Usa 0 para envío gratis en todos los pedidos."
            />
            <Field name="deliveryTime" label="Estimación de entrega" hint="Texto orientativo, no una garantía. Depende de la preparación y la distancia; evita plazos fijos (máx. 60 caracteres)." defaultValue={v(s, "deliveryTime", settings.shipping.deliveryTime)} required />
          </div>
        )}
      </Card>

      <Card
        id="announcements"
        title="Barra de anuncios"
        description="La franja que se desplaza en la parte superior de la tienda. Un mensaje por línea (máx. 10). {freeThreshold} y {flatFee} insertan los importes actuales. Vacío = barra oculta."
        action={saveAnnouncementSettings}
        success="Barra de anuncios actualizada"
        disabled={lock}
      >
        {(s) => (
          <div>
            <label htmlFor="set-announcements" className={labelCls}>
              Mensajes
            </label>
            <textarea
              id="set-announcements"
              name="announcements"
              rows={6}
              defaultValue={v(s, "announcements", settings.announcements.join("\n")) as string}
              className={input}
            />
          </div>
        )}
      </Card>

      <Card
        id="alerts"
        title="Inventario y notificaciones"
        description="Cuándo se considera que un producto tiene «stock bajo» y a dónde llegan los correos de nuevos pedidos y del formulario de contacto (requiere SMTP)."
        action={saveAlertSettings}
        success="Ajustes de alertas actualizados"
        disabled={lock}
      >
        {(s) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="lowStockThreshold"
              label="Alerta de stock bajo en"
              type="number"
              defaultValue={v(s, "lowStockThreshold", settings.inventory.lowStockThreshold)}
              hint="Se marcan los productos con esta cantidad o menos disponibles."
              required
            />
            <Field
              name="orderEmail"
              label="Enviar alertas de pedidos a"
              type="email"
              defaultValue={v(s, "orderEmail", settings.notifications.orderEmail)}
              placeholder="propietario@ejemplo.com"
            />
          </div>
        )}
      </Card>
    </>
  );
}

export function PasswordForm() {
  return (
    <Card
      id="account"
      title="Mi cuenta"
      description="Cambia la contraseña que usas para iniciar sesión en este panel."
      action={changePassword}
      success="Contraseña actualizada"
      resetOnSuccess
    >
      {() => (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="current" label="Contraseña actual" type="password" required autoComplete="current-password" />
          <Field name="next" label="Nueva contraseña" type="password" required autoComplete="new-password" hint="Al menos 10 caracteres." />
          <Field name="confirm" label="Repite la nueva contraseña" type="password" required autoComplete="new-password" />
        </div>
      )}
    </Card>
  );
}

export function AddTeamMemberForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  return (
    <Card
      id="team-add"
      title="Agregar miembro del equipo"
      description="El personal entra solo a su sucursal y gestiona pedidos, inventario y productos. Solo los administradores ven todas las sucursales y cambian los ajustes."
      action={addTeamMember}
      success="Miembro del equipo agregado"
      resetOnSuccess
    >
      {(s) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Nombre" defaultValue={s.ok ? "" : s.values?.name} />
          <Field name="email" label="Correo electrónico" type="email" required defaultValue={s.ok ? "" : s.values?.email} />
          <Field name="password" label="Contraseña temporal" type="password" required autoComplete="new-password" hint="Al menos 10 caracteres: podrá cambiarla en Mi cuenta." />
          <div>
            <label htmlFor="set-role" className={labelCls}>
              Rol
            </label>
            <select
              key={s.ok ? "reset" : s.values?.role ?? "STAFF"}
              id="set-role"
              name="role"
              defaultValue={s.ok ? "STAFF" : s.values?.role ?? "STAFF"}
              onChange={(e) => setRole(e.target.value === "ADMIN" ? "ADMIN" : "STAFF")}
              className={input}
            >
              <option value="STAFF">Personal</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="set-branchId" className={labelCls}>
              Sucursal {role === "STAFF" ? "" : "(los administradores ven todas)"}
            </label>
            <select
              id="set-branchId"
              name="branchId"
              defaultValue={s.ok ? "" : s.values?.branchId ?? ""}
              required={role === "STAFF"}
              disabled={role === "ADMIN"}
              className={input}
            >
              <option value="">{role === "ADMIN" ? "Todas las sucursales" : "Elige una sucursal…"}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {branches.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Todavía no hay sucursales activas. Créalas en Sucursales antes de agregar personal.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
