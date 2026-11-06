"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./toast";

// Server actions can't fire client toasts, and successful auth/product actions
// end in a redirect. So they redirect with `?flash=<key>` and this component —
// mounted once at the root — shows the matching toast on the destination page,
// then strips the param. It watches pathname/searchParams (not just mount) so it
// fires on client-side navigations too, since the root layout never re-mounts.
const MESSAGES: Record<
  string,
  { variant: "success" | "error" | "info"; message: string; title?: string }
> = {
  login: { variant: "success", message: "¡Hola de nuevo!", title: "Sesión iniciada" },
  register: { variant: "success", message: "¡Bienvenido a Toby!", title: "Cuenta creada" },
  "admin-login": { variant: "success", message: "Sesión iniciada en el panel.", title: "Panel" },
  "signed-out": { variant: "info", message: "Cerraste sesión." },
  "product-created": { variant: "success", message: "Producto creado.", title: "Guardado" },
  "product-updated": { variant: "success", message: "Producto actualizado.", title: "Guardado" },
  "product-deleted": { variant: "success", message: "Producto eliminado." },
  "product-in-use": {
    variant: "error",
    message: "Este producto aparece en pedidos anteriores, así que no se puede eliminar. Desmarca «Activo» para ocultarlo.",
    title: "No se eliminó",
  },
  "category-deleted": { variant: "success", message: "Categoría eliminada." },
  "category-in-use": {
    variant: "error",
    message: "Esta categoría todavía tiene productos. Muévelos o elimínalos primero.",
    title: "No se eliminó",
  },
  "delete-failed": { variant: "error", message: "No se pudo eliminar. Inténtalo de nuevo.", title: "No se eliminó" },
  "password-reset": { variant: "success", message: "Tu contraseña se actualizó.", title: "Listo" },
  "email-verified": { variant: "success", message: "Tu correo está verificado.", title: "Gracias" },
  "verify-send-failed": {
    variant: "error",
    message: "No pudimos enviar el código de verificación ahora. Inténtalo de nuevo en un momento.",
    title: "No se envió",
  },
};

function FlashToastInner() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firedFor = useRef("");

  useEffect(() => {
    const key = searchParams.get("flash");
    if (!key) return;

    // fire once per (path + key) so it doesn't repeat under dev StrictMode
    const sig = `${pathname}|${key}`;
    if (firedFor.current === sig) return;
    firedFor.current = sig;

    const entry = MESSAGES[key];
    if (entry) {
      const opts = entry.title ? { title: entry.title } : undefined;
      if (entry.variant === "success") toast.success(entry.message, opts);
      else if (entry.variant === "error") toast.error(entry.message, opts);
      else toast.info(entry.message, opts);
    }

    // Remove the flash param without a reload or extra history entry.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, searchParams, toast, router]);

  return null;
}

export function FlashToast() {
  // useSearchParams must be inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <FlashToastInner />
    </Suspense>
  );
}
