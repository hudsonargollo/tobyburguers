/* eslint-disable @next/next/no-img-element */

// Renders a product image, or an elegant branded placeholder when no image
// is available yet (before real product photography is added).

const GRADIENTS = [
  "linear-gradient(135deg, #eaf4e6, #d6ead1)",
  "linear-gradient(135deg, #f7f5ea, #edf0dd)",
  "linear-gradient(135deg, #fdeedd, #f8dcc0)",
  "linear-gradient(135deg, #e6f0e2, #cfe4c9)",
];

function pickGradient(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return GRADIENTS[sum % GRADIENTS.length];
}

export function ProductImage({
  src,
  alt,
  seed,
  className = "",
  fit = "cover",
  priority = false,
}: {
  src?: string;
  alt: string;
  seed: string;
  className?: string;
  /** `contain` keeps the whole packshot visible on a white stage. */
  fit?: "cover" | "contain";
  priority?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`@container flex h-full w-full items-center justify-center ${className}`}
      style={{ background: pickGradient(seed) }}
      role="img"
      aria-label={alt}
    >
      <span className="flex flex-col items-center gap-2 text-brand">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" opacity="0.75">
          <path d="M4 9h16l-1.5 10.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 9Z" />
          <path d="M8.5 9 10 4.5M15.5 9 14 4.5" />
        </svg>
        <span className="hidden text-[0.6rem] font-semibold uppercase tracking-[0.22em] opacity-80 @[9rem]:block">
          Foto próximamente
        </span>
      </span>
    </div>
  );
}
