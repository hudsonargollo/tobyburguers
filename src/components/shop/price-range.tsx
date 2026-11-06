"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

const STEP = 100;

type Props = {
  /** Cheapest / dearest piece in scope (rounded to Bs 100). */
  bounds: [number, number];
  /** Active range from the URL (undefined = open end). */
  min?: number;
  max?: number;
  /** null = no limit on that side. */
  onCommit: (min: number | null, max: number | null) => void;
};

// Quick ranges derived from the real price spread, rounded to Bs 500:
// "Under Bs 3,000" · "Bs 3,000 – 4,000" · "Bs 4,000 & above".
function presets(lo: number, hi: number) {
  const span = hi - lo;
  if (span < 1000) return [];
  const r = (n: number) => Math.round(n / 500) * 500;
  const t1 = Math.max(r(lo + span / 3), lo + STEP);
  const t2 = Math.min(r(lo + (2 * span) / 3), hi - STEP);
  if (t2 <= t1) return [];
  return [
    { label: `Hasta ${formatPrice(t1)}`, min: null, max: t1 },
    { label: `${formatPrice(t1)} – ${formatPrice(t2).replace("Bs ", "")}`, min: t1, max: t2 },
    { label: `${formatPrice(t2)} o más`, min: t2, max: null },
  ];
}

/** Dual-thumb price slider with editable "Bs" fields and quick-range chips. */
export function PriceRange({ bounds: [lo, hi], min, max, onCommit }: Props) {
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
  const [a, setA] = useState(clamp(min ?? lo));
  const [b, setB] = useState(clamp(max ?? hi));
  const [draftA, setDraftA] = useState<string | null>(null);
  const [draftB, setDraftB] = useState<string | null>(null);

  const pct = (n: number) => ((n - lo) / (hi - lo)) * 100;

  function commit(nextA = a, nextB = b) {
    const x = Math.min(nextA, nextB);
    const y = Math.max(nextA, nextB);
    const newMin = x <= lo ? null : x;
    const newMax = y >= hi ? null : y;
    if (newMin === (min ?? null) && newMax === (max ?? null)) return; // nothing changed
    onCommit(newMin, newMax);
  }

  function commitField(which: "a" | "b") {
    const raw = which === "a" ? draftA : draftB;
    if (raw == null) return;
    const digits = raw.replace(/[^\d]/g, "");
    let n = digits ? clamp(Number(digits)) : which === "a" ? lo : hi;
    let nextA = a;
    let nextB = b;
    if (which === "a") nextA = n = Math.min(n, b);
    else nextB = n = Math.max(n, a);
    setA(nextA);
    setB(nextB);
    setDraftA(null);
    setDraftB(null);
    commit(nextA, nextB);
  }

  const chips = presets(lo, hi);
  const fieldCls =
    "w-full bg-transparent py-2 pr-2 text-sm font-medium text-ink outline-none placeholder:text-muted/60";

  return (
    <div>
      {/* Selected range, large */}
      <p className="flex items-baseline justify-between font-display text-lg font-semibold text-ink">
        <span>{formatPrice(a)}</span>
        <span className="text-sm text-muted">a</span>
        <span>{formatPrice(b)}</span>
      </p>

      {/* Dual slider */}
      <div className="range-dual mt-3">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--line-strong)]" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent-soft via-accent to-accent-strong"
          style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }}
        />
        <input
          type="range"
          min={lo}
          max={hi}
          step={STEP}
          value={a}
          aria-label="Precio mínimo"
          aria-valuetext={formatPrice(a)}
          // keep the low thumb grabbable when both sit at the top end
          style={{ zIndex: a >= b - STEP ? 4 : 3 }}
          onChange={(e) => setA(Math.min(Number(e.target.value), b))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
        />
        <input
          type="range"
          min={lo}
          max={hi}
          step={STEP}
          value={b}
          aria-label="Precio máximo"
          aria-valuetext={formatPrice(b)}
          onChange={(e) => setB(Math.max(Number(e.target.value), a))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
        />
      </div>

      {/* Exact amounts */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {(["a", "b"] as const).map((which, i) => (
          <label
            key={which}
            className={`flex items-center rounded-lg border border-[var(--line-strong)] bg-surface/80 pl-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-[rgba(232,190,26,0.22)] ${
              i === 1 ? "col-start-3" : ""
            }`}
          >
            <span className="mr-1.5 text-xs font-medium uppercase tracking-wide text-muted">Bs</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={which === "a" ? "Precio mínimo en bolivianos" : "Precio máximo en bolivianos"}
              value={
                which === "a"
                  ? (draftA ?? a.toLocaleString("es-BO"))
                  : (draftB ?? b.toLocaleString("es-BO"))
              }
              onChange={(e) => (which === "a" ? setDraftA(e.target.value) : setDraftB(e.target.value))}
              onFocus={(e) => e.target.select()}
              onBlur={() => commitField(which)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitField(which);
                }
              }}
              className={fieldCls}
            />
          </label>
        ))}
        <span className="col-start-2 row-start-1 text-muted">–</span>
      </div>

      {/* Quick ranges */}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => {
            const active = (min ?? null) === c.min && (max ?? null) === c.max;
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={active}
                onClick={() => (active ? onCommit(null, null) : onCommit(c.min, c.max))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand bg-brand text-accent-soft dark:border-accent-strong"
                    : "border-[var(--line-strong)] text-ink hover:border-accent hover:text-accent-strong"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
