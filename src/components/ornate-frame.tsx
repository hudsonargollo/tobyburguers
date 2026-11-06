import type { ReactNode } from "react";

// Classic double-line frame with ornamental corners — evokes a fine
// productos box. Used around the hero and feature panels.

export function OrnateFrame({
  children,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const border = tone === "dark" ? "border-[rgba(243,196,187,0.5)]" : "border-[var(--frame)]";
  const corner = tone === "dark" ? "border-accent" : "border-brand";

  return (
    <div className={`relative ${className}`}>
      {/* outer + inner double border */}
      <div className={`absolute inset-0 border ${border}`} />
      <div className={`absolute inset-[6px] border ${border} opacity-60`} />

      {/* corner accents */}
      <Corner className={`left-2 top-2 border-l-2 border-t-2 ${corner}`} />
      <Corner className={`right-2 top-2 border-r-2 border-t-2 ${corner}`} />
      <Corner className={`bottom-2 left-2 border-b-2 border-l-2 ${corner}`} />
      <Corner className={`bottom-2 right-2 border-b-2 border-r-2 ${corner}`} />

      <div className="relative">{children}</div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute h-4 w-4 ${className}`} aria-hidden="true" />;
}
