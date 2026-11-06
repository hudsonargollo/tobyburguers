import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderCart } from "./cart/header-cart";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { useBranchPicker } from "./branch-picker";

const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Menú", href: "/shop" },
  { label: "Sucursales", href: "/sucursal" },
  { label: "Nosotros", href: "/about" },
  { label: "Contacto", href: "/contact" },
];

// Shared style for the header's circular icon buttons
const iconBtn =
  "relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-surface/60 text-brand transition hover:border-accent hover:bg-accent/10 hover:text-accent-strong dark:text-ink";

export function SiteHeader({ branch = null }: { branch?: { name: string } | null }) {
  const pathname = usePathname();
  const picker = useBranchPicker();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        {/* Brand */}
        <Link
          href="/"
          aria-label="Toby ¡Mi Hamburguesa! — inicio"
          className="group flex min-w-0 shrink items-center transition-transform duration-300 hover:scale-[1.02] lg:shrink-0 lg:justify-self-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/toby-logo.webp"
            alt="Toby ¡Mi Hamburguesa!"
            width={757}
            height={329}
            className="h-8 w-auto dark:hidden sm:h-9 lg:h-10"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/toby-logo-dark.webp"
            alt=""
            aria-hidden="true"
            width={757}
            height={329}
            className="hidden h-8 w-auto dark:block sm:h-9 lg:h-10"
          />
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-8 lg:flex lg:justify-self-center">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative py-1 text-sm font-semibold"
              >
                <span
                  className={
                    active
                      ? "text-accent-strong"
                      : "text-ink/70 transition-colors group-hover:text-brand dark:group-hover:text-accent"
                  }
                >
                  {item.label}
                </span>
                <span
                  className={`absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300 ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 text-brand sm:gap-2 lg:justify-self-end">
          <button
            type="button"
            onClick={() => picker.open()}
            className="mr-1 hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-surface/60 px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-accent hover:text-accent-strong md:flex dark:text-ink"
            title="Cambiar sucursal"
          >
            <PinIcon />
            <span className="max-w-[10rem] truncate">{branch?.name ?? "Elegir sucursal"}</span>
          </button>
          <Link href="/search" aria-label="Buscar" className={`${iconBtn} hidden sm:flex`}>
            <SearchIcon />
          </Link>
          <Link href="/account" aria-label="Mi cuenta" className={`${iconBtn} hidden sm:flex`}>
            <UserIcon />
          </Link>
          <ThemeToggle className={iconBtn} />
          <HeaderCart className={iconBtn} />
          <MobileMenu branchName={branch?.name ?? null} />
        </div>
      </div>

      {/* Accent hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(232,190,26,0.5)] to-transparent" />
    </header>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}
