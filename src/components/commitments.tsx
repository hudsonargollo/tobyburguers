const COMMITMENTS = [
  {
    title: "Hechos al momento",
    body: "La carne va a la parrilla y el pan se tosta cuando llega tu pedido.",
    icon: <BurgerIcon />,
  },
  {
    title: "Delivery y retiro",
    body: "Pide en línea y recíbelo en tu puerta o retíralo en tu sucursal Toby.",
    icon: <ScooterIcon />,
  },
  {
    title: "Precios claros",
    body: "Combos con todo detallado y promos de la semana, sin sorpresas al pagar.",
    icon: <TagIcon />,
  },
  {
    title: "Cerca de ti",
    body: "Sucursales en Santa Cruz y El Alto, con delivery propio por AutoToby y PedidosYa.",
    icon: <PinIcon />,
  },
];

export function Commitments() {
  return (
    <section className="bg-brand py-20 text-light">
      <div className="mx-auto max-w-6xl px-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/toby-logo.webp"
          alt="Toby ¡Mi Hamburguesa!"
          width={757}
          height={329}
          className="mx-auto h-10 w-auto"
        />
        <span className="eyebrow mt-4 block text-accent-soft">Nuestro compromiso</span>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Comida rápida, bien hecha
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-light/75">
          Toby: la hamburguesa de Santa Cruz desde 1981, hecha al momento en cada sucursal.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-4 px-5 sm:grid-cols-2">
        {COMMITMENTS.map((c) => (
          <div
            key={c.title}
            className="flex items-start gap-4 rounded-2xl border border-[rgba(232,190,26,0.25)] bg-[rgba(255,255,255,0.05)] p-6 text-left transition hover:border-accent-soft/60 hover:bg-[rgba(255,255,255,0.08)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-soft">
              {c.icon}
            </span>
            <span>
              <span className="block font-display text-lg font-bold">{c.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-light/70">{c.body}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BurgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* top bun */}
      <path d="M4 9c0-3 3.6-5 8-5s8 2 8 5" />
      {/* lettuce */}
      <path d="M4 12.5h16" />
      {/* patty */}
      <path d="M4.5 16h15" />
      {/* bottom bun */}
      <path d="M4.5 19.5h15a1 1 0 0 0 0-2h-15a1 1 0 0 0 0 2z" />
    </svg>
  );
}
function ScooterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="2.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
      <path d="M8 17.5h5.5l2-5h3" />
      <path d="M14 12.5 12.8 8H10" />
      <path d="M15.5 8.5h3" />
      <path d="M6 12h3" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12L12 3h8v8l-9 9-8-8z" strokeLinejoin="round" />
      <circle cx="16" cy="8" r="1.4" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
