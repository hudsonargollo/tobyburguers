// `ChickenMark` is the line-art drumstick used for faint decorative watermarks,
// where the full-colour lockup (see brand/logo.tsx) would be too heavy.

type MarkProps = {
  size?: number;
  className?: string;
  /** Kept for call sites that still pass a colour; the logo carries its own. */
  color?: string;
  /** Highlight used by the drumstick watermark (bone, steam). */
  accent?: string;
};

export function ChickenMark({
  size = 44,
  className = "",
  color = "currentColor",
  accent = "var(--color-accent)",
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* roasted drumstick meat */}
      <path
        d="M20 44c-5-5-4-14 3-20 6-5.4 15-5.6 20-1 4.6 4.4 4 12-1.6 17-3.4 3-8 3.6-11.4 2"
        stroke={color}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* crisp skin highlight */}
      <path d="M30 27c3.4-2.2 7.6-2 10.4.6" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
      {/* bone shaft */}
      <path d="M22.5 42.5l-6.2 6.2" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      {/* bone knuckles */}
      <path
        d="M14 50.5a3.6 3.6 0 1 0-4.6 4.6 3.6 3.6 0 1 0 4.6 4.6"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        transform="translate(1 -3)"
      />
      {/* heat */}
      <path d="M40 16c2-2.4 2-4.6 0-7M47 19c2.4-2.6 2.4-5 0-7.6" stroke={accent} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
