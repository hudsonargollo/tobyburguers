"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, refreshAdminSession } from "@/lib/admin";
import { hashPassword, verifyPassword } from "@/lib/password";
import { saveStoreSettings, type StoreSettings } from "@/lib/settings";
import { dbErrorKind } from "@/lib/db-errors";

export type SettingsState = { ok?: boolean; error?: string; values?: Record<string, string> };

const ADMIN_MIN_PASSWORD = 10;

// Store-wide settings may only be changed by an ADMIN (not STAFF).
async function requireOwner() {
  const session = await requireAdmin();
  if (session.role !== "ADMIN") throw new Error("Solo un administrador puede cambiar los ajustes de la tienda.");
  return session;
}

function form(fd: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "").trim()]));
}

async function save<K extends keyof StoreSettings>(section: K, value: StoreSettings[K]): Promise<SettingsState> {
  try {
    await saveStoreSettings(section, value);
  } catch (err) {
    console.error("[settings] save failed:", err);
    return { error: "No se pudo guardar: base de datos no disponible." };
  }
  // Header, footer, chat, shipping and every page read these settings.
  revalidatePath("/", "layout");
  return { ok: true };
}

const url = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Los enlaces deben empezar por https://");

// ---------- Contact ----------
export async function saveContactSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const values = form(fd, ["email", "phone", "whatsapp", "city", "hours"]);
  const parsed = z
    .object({
      email: z.string().refine((v) => v === "" || z.string().email().safeParse(v).success, "Ingresa un correo válido"),
      phone: z.string().max(30),
      whatsapp: z
        .string()
        .transform((v) => v.replace(/[^0-9]/g, ""))
        .refine((v) => v === "" || (v.length >= 10 && v.length <= 15), "WhatsApp: formato internacional, p. ej. 59171234567"),
      city: z.string().max(120),
      hours: z.string().max(120),
    })
    .safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  return { ...(await save("contact", parsed.data)), values };
}

// ---------- Social ----------
export async function saveSocialSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const values = form(fd, ["instagram", "facebook", "tiktok"]);
  const parsed = z.object({ instagram: url, facebook: url, tiktok: url }).safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  return { ...(await save("social", parsed.data)), values };
}

// ---------- Shipping ----------
export async function saveShippingSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const values = form(fd, ["flatFee", "freeThreshold", "deliveryTime"]);
  const parsed = z
    .object({
      flatFee: z.coerce.number().int("Solo bolivianos enteros").min(0, "No puede ser negativo").max(100000),
      freeThreshold: z.coerce.number().int("Solo bolivianos enteros").min(0, "No puede ser negativo").max(10_000_000),
      deliveryTime: z.string().min(2, "Ingresa una estimación de entrega, no un plazo garantizado").max(60),
    })
    .safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  return { ...(await save("shipping", parsed.data)), values };
}

// ---------- Announcement bar ----------
export async function saveAnnouncementSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const raw = String(fd.get("announcements") ?? "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 10) return { error: "Usa 10 líneas como máximo.", values: { announcements: raw } };
  if (lines.some((l) => l.length > 120)) return { error: "Cada línea debe tener 120 caracteres como máximo.", values: { announcements: raw } };
  return { ...(await save("announcements", lines)), values: { announcements: raw } };
}

// ---------- Inventory + notifications ----------
export async function saveAlertSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const values = form(fd, ["lowStockThreshold", "orderEmail"]);
  const parsed = z
    .object({
      lowStockThreshold: z.coerce.number().int().min(0).max(1000),
      orderEmail: z.string().refine((v) => v === "" || z.string().email().safeParse(v).success, "Ingresa un correo válido"),
    })
    .safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  const inv = await save("inventory", { lowStockThreshold: parsed.data.lowStockThreshold });
  if (inv.error) return { ...inv, values };
  return { ...(await save("notifications", { orderEmail: parsed.data.orderEmail })), values };
}

// ---------- My account: change password ----------
export async function changePassword(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const session = await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (next.length < ADMIN_MIN_PASSWORD) return { error: `La nueva contraseña debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.` };
  if (next !== confirm) return { error: "Las nuevas contraseñas no coinciden." };
  try {
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user || !verifyPassword(current, user.passwordHash)) return { error: "La contraseña actual es incorrecta." };
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
    await refreshAdminSession(session.email); // other devices are signed out
  } catch {
    return { error: "No se pudo actualizar: base de datos no disponible." };
  }
  return { ok: true };
}

// ---------- Team ----------
export async function addTeamMember(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e); // a signed-out redirect must reach the browser
    return { error: (e as Error).message };
  }
  const values = form(fd, ["name", "email", "role", "branchId"]);
  const password = String(fd.get("password") ?? "");
  const parsed = z
    .object({
      name: z.string().max(120),
      email: z.string().email("Ingresa un correo válido").max(200),
      role: z.enum(["ADMIN", "STAFF"]),
      branchId: z.string().optional(),
    })
    .safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  if (password.length < ADMIN_MIN_PASSWORD)
    return { error: `La contraseña debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.`, values };

  // Staff logins are bound to exactly one store; admins are global.
  let branchId: string | null = null;
  if (parsed.data.role === "STAFF") {
    if (!parsed.data.branchId) return { error: "Elige la sucursal de este usuario.", values };
    const branch = await prisma.branch
      .findFirst({ where: { id: parsed.data.branchId, active: true }, select: { id: true } })
      .catch(() => null);
    if (!branch) return { error: "La sucursal elegida no existe.", values };
    branchId = branch.id;
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name || null,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        branchId,
        passwordHash: hashPassword(password),
      },
    });
  } catch (err) {
    if (dbErrorKind(err) === "duplicate") return { error: "Ya existe un miembro del equipo con ese correo.", values };
    return { error: "No se pudo agregar: base de datos no disponible.", values };
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Move a staff member to another branch (or make an admin global). */
export async function setTeamMemberBranch(userId: string, formData: FormData): Promise<void> {
  await requireOwner();
  const branchIdRaw = String(formData.get("branchId") ?? "").trim();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return;

  if (user.role === "ADMIN") {
    await prisma.user.update({ where: { id: userId }, data: { branchId: null } });
  } else {
    if (!branchIdRaw) return;
    const branch = await prisma.branch
      .findFirst({ where: { id: branchIdRaw, active: true }, select: { id: true } })
      .catch(() => null);
    if (!branch) return;
    await prisma.user.update({ where: { id: userId }, data: { branchId: branch.id } });
  }
  revalidatePath("/admin/settings");
}

export async function removeTeamMember(id: string): Promise<void> {
  const session = await requireOwner();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.email === session.email) return; // can't remove yourself
  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return; // never remove the last admin
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/settings");
}
