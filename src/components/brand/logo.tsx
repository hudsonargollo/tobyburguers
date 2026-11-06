// The full-colour Toby ¡Mi Hamburguesa! lockup, for the places that used to carry the
// square badge. Size it with a Tailwind height class (the 1200x488 ratio holds).

type LogoProps = {
  className?: string;
  /** Decorative uses (next to a heading that already names the brand). */
  decorative?: boolean;
};

export function BrandLogo({ className = "", decorative = false }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/toby-logo.webp"
      alt={decorative ? "" : "Toby ¡Mi Hamburguesa!"}
      aria-hidden={decorative || undefined}
      width={1200}
      height={488}
      className={`w-auto shrink-0 ${className}`}
    />
  );
}
