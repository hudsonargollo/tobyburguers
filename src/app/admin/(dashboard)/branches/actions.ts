"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { refreshStorefront } from "@/lib/cache-tags";
import { dbErrorKind } from "@/lib/db-errors";

export type BranchState = {
  ok?: boolean;
  error?: string;
  values?: Record<string, string | boolean>;
};

const optionalMoney = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z
    .number()
    .min(0, "El monto no puede ser negativo")
    .max(10_000_000, "El monto es demasiado alto")
    .nullable()
);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https:\/\/[^\s]+$/i.test(v) || v.startsWith("/"),
    "Usa un enlace https:// o una ruta que empiece por /"
  );

const optionalLatitude = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z
    .number()
    .min(-90, "La latitud debe estar entre -90 y 90")
    .max(90, "La latitud debe estar entre -90 y 90")
    .nullable()
);

const optionalLongitude = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z
    .number()
    .min(-180, "La longitud debe estar entre -180 y 180")
    .max(180, "La longitud debe estar entre -180 y 180")
    .nullable()
);

const schema = z
  .object({
    name: z.string().trim().min(2, "Ingresa el nombre de la sucursal").max(120),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{2,8}$/, "El código debe tener de 2 a 8 letras o números (p. ej. TB01)")
      .transform((v) => v.toUpperCase()),
    slug: z.string().trim().max(120),
    address: z.string().trim().min(3, "Ingresa la dirección").max(200),
    city: z.string().trim().min(2, "Ingresa la ciudad").max(120),
    phone: z.string().trim().max(30),
    whatsapp: z
      .string()
      .transform((v) => v.replace(/[^0-9]/g, ""))
      .refine((v) => v === "" || (v.length >= 10 && v.length <= 15), "WhatsApp: formato internacional, p. ej. 59170000000"),
    hours: z.string().trim().max(120),
    image: optionalUrl,
    mapsUrl: optionalUrl,
    latitude: optionalLatitude,
    longitude: optionalLongitude,
    flatFee: optionalMoney,
    freeThreshold: optionalMoney,
    sortOrder: z.coerce.number().int().min(0).max(999),
    deliveryEnabled: z.boolean(),
    pickupEnabled: z.boolean(),
    active: z.boolean(),
  })
  .refine((d) => d.deliveryEnabled || d.pickupEnabled, {
    message: "Activa entrega a domicilio, retiro en tienda o ambos.",
    path: ["deliveryEnabled"],
  })
  .refine((d) => d.flatFee == null || d.freeThreshold == null || d.freeThreshold >= d.flatFee, {
    message: "El envío gratis debe ser mayor o igual al costo de envío (o usa 0 para gratis siempre).",
    path: ["freeThreshold"],
  });

function read(fd: FormData) {
  return {
    name: String(fd.get("name") ?? ""),
    code: String(fd.get("code") ?? ""),
    slug: String(fd.get("slug") ?? ""),
    address: String(fd.get("address") ?? ""),
    city: String(fd.get("city") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    whatsapp: String(fd.get("whatsapp") ?? ""),
    hours: String(fd.get("hours") ?? ""),
    image: String(fd.get("image") ?? ""),
    mapsUrl: String(fd.get("mapsUrl") ?? ""),
    latitude: String(fd.get("latitude") ?? ""),
    longitude: String(fd.get("longitude") ?? ""),
    flatFee: String(fd.get("flatFee") ?? ""),
    freeThreshold: String(fd.get("freeThreshold") ?? ""),
    sortOrder: String(fd.get("sortOrder") ?? "0"),
    deliveryEnabled: fd.get("deliveryEnabled") === "on",
    pickupEnabled: fd.get("pickupEnabled") === "on",
    active: fd.get("active") === "on",
  };
}

function data(d: z.infer<typeof schema>) {
  return {
    name: d.name,
    code: d.code,
    slug: d.slug ? slugify(d.slug) : slugify(d.name),
    address: d.address,
    city: d.city,
    phone: d.phone || null,
    whatsapp: d.whatsapp || null,
    hours: d.hours || null,
    image: d.image || null,
    mapsUrl: d.mapsUrl || null,
    latitude: d.latitude,
    longitude: d.longitude,
    flatFee: d.flatFee,
    freeThreshold: d.freeThreshold,
    sortOrder: d.sortOrder,
    deliveryEnabled: d.deliveryEnabled,
    pickupEnabled: d.pickupEnabled,
    active: d.active,
  };
}

export async function createBranch(_prev: BranchState, fd: FormData): Promise<BranchState> {
  const values = read(fd);
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e);
    return { error: (e as Error).message, values };
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  if (!slugify(parsed.data.slug || parsed.data.name)) return { error: "Ingresa un nombre válido.", values };

  try {
    await prisma.branch.create({ data: data(parsed.data) });
  } catch (err) {
    if (dbErrorKind(err) === "duplicate") return { error: "Ya existe una sucursal con ese código o slug.", values };
    return { error: "No se pudo crear la sucursal.", values };
  }
  refreshStorefront();
  revalidatePath("/admin/branches");
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function updateBranch(id: string, _prev: BranchState, fd: FormData): Promise<BranchState> {
  const values = read(fd);
  try {
    await requireOwner();
  } catch (e) {
    unstable_rethrow(e);
    return { error: (e as Error).message, values };
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  if (!slugify(parsed.data.slug || parsed.data.name)) return { error: "Ingresa un nombre válido.", values };

  try {
    await prisma.branch.update({ where: { id }, data: data(parsed.data) });
  } catch (err) {
    if (dbErrorKind(err) === "duplicate") return { error: "Ya existe otra sucursal con ese código o slug.", values };
    return { error: "No se pudo guardar la sucursal.", values };
  }
  refreshStorefront();
  revalidatePath("/admin/branches");
  revalidatePath(`/admin/branches/${id}`);
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function toggleBranchActive(id: string, formData: FormData): Promise<void> {
  await requireOwner();
  const active = formData.get("active") === "1";
  await prisma.branch.update({ where: { id }, data: { active } });
  refreshStorefront();
  revalidatePath("/admin/branches");
  revalidatePath("/admin/inventory");
}

export async function deleteBranch(id: string): Promise<void> {
  await requireOwner();
  let flash = "branch-deleted";
  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      select: { _count: { select: { orders: true, users: true } } },
    });
    if (!branch) flash = "branch-missing";
    else if (branch._count.orders > 0 || branch._count.users > 0) flash = "branch-in-use";
    else await prisma.branch.delete({ where: { id } });
  } catch (err) {
    flash = dbErrorKind(err) === "in-use" ? "branch-in-use" : "branch-delete-failed";
  }
  refreshStorefront();
  revalidatePath("/admin/branches");
  redirect(`/admin/branches?flash=${flash}`);
}
