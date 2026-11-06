"use client";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft"
    >
      {label}
    </button>
  );
}
