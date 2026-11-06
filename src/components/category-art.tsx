/** Line icons for the Toby category tiles. */

type Props = { className?: string };

const svg = (className: string) => ({
  viewBox: "0 0 120 120",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  className,
  "aria-hidden": true as const,
});

function Burger({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      {/* top bun */}
      <path d="M28 52c0-14 14-22 32-22s32 8 32 22z" strokeLinejoin="round" />
      <path d="M44 40h3M58 36h3M72 40h3" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* cheese + patty */}
      <path d="M26 56h68l-8 8H34z" strokeLinejoin="round" />
      <path d="M30 68h60a6 6 0 0 1 0 10H30a6 6 0 0 1 0-10z" strokeLinejoin="round" />
      {/* bottom bun */}
      <path d="M30 82h60c0 10-12 16-30 16s-30-6-30-16z" strokeLinejoin="round" />
    </svg>
  );
}

function Plate({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      <path d="M22 66h76c-2 18-18 30-38 30S24 84 22 66z" strokeLinejoin="round" />
      <path d="M34 96h52" strokeLinecap="round" opacity="0.6" />
      <path d="M46 66c2-10 8-16 14-16s12 6 14 16" strokeLinejoin="round" opacity="0.85" />
      <path d="M30 60c-4-6-2-12 4-14M90 60c4-6 2-12-4-14" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Sandwich({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      {/* long roll */}
      <path d="M22 58c0-8 10-14 38-14s38 6 38 14z" strokeLinejoin="round" />
      <path d="M22 62h76" strokeLinecap="round" />
      <path d="M28 70c6 4 12 4 18 0s12-4 18 0 12 4 18 0" strokeLinecap="round" opacity="0.8" />
      <path d="M22 76h76c0 8-10 14-38 14S22 84 22 76z" strokeLinejoin="round" />
    </svg>
  );
}

function Box({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      <path d="M26 46h68v50a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4z" strokeLinejoin="round" />
      <path d="M26 46l10-16h48l10 16" strokeLinejoin="round" />
      <path d="M60 30v16" strokeLinecap="round" opacity="0.7" />
      <path d="M40 66h40" strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />
    </svg>
  );
}

function Drumstick({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      {/* meat */}
      <path
        d="M78 26c12 6 18 20 14 33-4 13-16 22-29 21-6 0-10-3-13-7-4-6-4-14 1-20l6-8c5-7 12-14 21-19z"
        strokeLinejoin="round"
      />
      <path d="M74 38c6 4 9 11 7 18" strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />
      <path d="M50 76L32 94" strokeLinecap="round" strokeWidth="6" />
      <path d="M32 94c-6 2-10-2-9-7 4-1 7 0 9 7zm0 0c2 6-2 10-7 9-1-5 0-8 7-9z" strokeLinejoin="round" />
      <path d="M92 54c3 4 4 7 2 10" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

function Wings({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      <path d="M30 44c16-6 34 2 40 18 4 12-4 22-16 22-14 0-26-10-28-22-1-7 0-13 4-18z" strokeLinejoin="round" />
      <path d="M46 56c8-2 16 2 20 10" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      <path d="M78 40l14-10M84 56l16-4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function IceCream({ className = "" }: Props) {
  return (
    <svg {...svg(className)}>
      {/* cone */}
      <path d="M42 62h36L60 100z" strokeLinejoin="round" />
      <path d="M48 72l20 20M56 68l16 16" strokeWidth="1.5" opacity="0.5" />
      {/* scoops */}
      <circle cx="52" cy="52" r="12" />
      <circle cx="70" cy="52" r="12" />
      <circle cx="61" cy="38" r="11" />
    </svg>
  );
}

const MAP: Record<string, (p: Props) => React.ReactElement> = {
  premium: Burger,
  express: Burger,
  clasicas: Burger,
  plato: Plate,
  philly: Sandwich,
  boxy: Box,
  pollo: Drumstick,
  "nuggets-alitas": Wings,
  postres: IceCream,
};

export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const Art = MAP[slug] ?? Burger;
  return <Art className={className} />;
}
