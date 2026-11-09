import Link from "next/link";
import type { LoyaltySettings } from "@/lib/settings-shared";
import { pointRuleLabel, stampRuleLabel } from "@/lib/loyalty-shared";

// Homepage billboard for the loyalty programme. Kept deliberately short: the
// rules live on /club-toby, this only has to earn the click.
export function ClubBand({ rules }: { rules: LoyaltySettings }) {
  if (!rules.enabled) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-12 text-center text-light sm:px-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(60% 120% at 15% 0%, rgba(245,216,91,0.55), transparent 60%), radial-gradient(50% 110% at 90% 100%, rgba(232,190,26,0.4), transparent 65%)",
          }}
        />
        <div className="relative">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent">
            {rules.name}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {stampRuleLabel(rules)}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-light/75 sm:text-base">
            Y además {pointRuleLabel(rules)}, canjeables por regalos en nuestra tienda de premios:
            botellas, bolsos y sorpresas para los más chicos.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/club-toby"
              className="rounded-full bg-gradient-to-r from-accent-soft to-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-brand transition hover:opacity-90"
            >
              Conocer el club
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-light/30 px-8 py-3 text-sm font-semibold text-light transition hover:border-accent hover:text-accent"
            >
              Pedir ahora
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
