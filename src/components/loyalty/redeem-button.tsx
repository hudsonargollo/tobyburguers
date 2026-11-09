"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

// One points purchase in the rewards shop. On success the page is refreshed (so
// the balance and the "para recoger" list update) and the code is kept here,
// because that code is what the counter asks for.
export function RedeemButton({
  rewardId,
  rewardName,
  costPoints,
  pointsShort,
  stock,
}: {
  rewardId: string;
  rewardName: string;
  costPoints: number;
  /** How many points the customer still needs (0 = can afford it). */
  pointsShort: number;
  stock: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const disabled = busy || stock <= 0 || pointsShort > 0;

  async function redeem() {
    setBusy(true);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string; error?: string };
      if (!res.ok || !data.ok || !data.code) {
        throw new Error(data.error || "No pudimos completar el canje.");
      }
      setCode(data.code);
      toast.success(`Canjeaste "${rewardName}". Pide tu regalo en caja con el código ${data.code}.`, {
        title: "¡Regalo reservado!",
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos completar el canje.", {
        title: "Canje no realizado",
      });
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <p className="mt-3 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-center text-xs text-ink">
        Presenta este código en caja: <span className="font-mono text-sm font-semibold">{code}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={redeem}
      disabled={disabled}
      title={
        stock <= 0
          ? "Agotado por ahora"
          : pointsShort > 0
            ? `Te faltan ${pointsShort} puntos para este regalo`
            : `Canjear por ${costPoints} puntos`
      }
      className="mt-3 w-full rounded-full bg-gradient-to-r from-accent-soft to-accent px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {busy
        ? "Canjeando…"
        : stock <= 0
          ? "Agotado"
          : pointsShort > 0
            ? `Faltan ${pointsShort} pts`
            : `Canjear ${costPoints} pts`}
    </button>
  );
}
