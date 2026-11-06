"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function toggleMessageHandled(id: string, handled: boolean): Promise<void> {
  await requireAdmin();
  try {
    await prisma.contactMessage.update({ where: { id }, data: { handled } });
  } catch (err) {
    console.error("[admin] could not update message:", err);
  }
  revalidatePath("/admin/messages");
}
