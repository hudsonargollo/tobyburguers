import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";
import { getBalances, getHistory } from "@/lib/loyalty";
import { movementLabel, pointRuleLabel, stampCard, stampRuleLabel } from "@/lib/loyalty-shared";
import type { LoyaltySettings } from "@/lib/settings-shared";
import { ProductImage } from "@/components/product-image";
import { RedeemButton } from "@/components/loyalty/redeem-button";
import { BrandLogo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { loyalty } = await getStoreSettings();
  return {
    title: `${loyalty.name}: suma sellos y gana`,
    description: `${loyalty.name} de Toby ¡Mi Hamburguesa! — ${stampRuleLabel(loyalty)} y ${pointRuleLabel(loyalty)} canjeables por regalos.`,
    alternates: { canonical: "/club-toby" },
  };
}

type Card = { id: string; name: string; slug: string; image?: string; filled: number; size: number };

export default async function ClubTobyPage() {
  const settings = await getStoreSettings();
  const rules = settings.loyalty;
  const session = await getCustomerSession();

  const [balances, rewards, cards, pending, history] = await loadClub(session?.id, rules);
  const eligibleLabel =
    rules.eligible === "all"
      ? "Todo el menú"
      : rules.eligible === "category"
        ? "Categorías seleccionadas del menú"
        : "Productos seleccionados del menú";

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-gradient-to-br from-cream-soft via-surface to-accent/10 px-6 py-12 text-center sm:px-10">
        <BrandLogo className="mx-auto h-9" />
        <span className="eyebrow mt-4 block">Programa de fidelidad</span>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {rules.name}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink/70">
          Cada hamburguesa que compras te acerca a la siguiente gratis, y tus pesos se convierten en
          regalos. Sin formularios, sin tarjetas de papel: tus sellos viven en tu cuenta.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-gradient-to-r from-accent-soft to-accent px-7 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-brand transition hover:opacity-90"
          >
            Pedir y sumar
          </Link>
          {!session && (
            <Link
              href="/register"
              className="rounded-full border border-[var(--line-strong)] px-7 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent-strong"
            >
              Crear mi cuenta
            </Link>
          )}
        </div>
      </section>

      {/* Balances + stamp cards */}
      {session && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-ink">Tu tarjeta</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line-strong)] bg-surface/80 p-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Puntos disponibles
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold text-ink">{balances.points}</p>
              <p className="mt-1 text-sm text-muted">Canjéalos en la tienda de regalos de abajo.</p>
            </div>
            <div className="rounded-2xl border border-[var(--line-strong)] bg-surface/80 p-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Sellos en total
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold text-ink">
                {balances.totalStamps}
              </p>
              <p className="mt-1 text-sm text-muted">{stampRuleLabel(rules)}.</p>
            </div>
          </div>

          {cards.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {cards.map((c) => (
                <StampCardView key={c.id} card={c} />
              ))}
            </div>
          )}
          {cards.length === 0 && (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] px-6 py-8 text-center text-sm text-muted">
              Todavía no tienes sellos. Tu primer pedido los empieza a llenar.
            </p>
          )}

          {pending.length > 0 && (
            <div className="mt-8 rounded-2xl border border-accent/45 bg-accent/8 p-6">
              <h3 className="font-display text-lg font-semibold text-ink">Listos para recoger</h3>
              <p className="mt-1 text-sm text-muted">
                Muestra este código en la caja de tu sucursal para llevarte el regalo.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {pending.map((r) => (
                  <li key={r.code} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">{r.rewardName}</span>
                    <span className="text-muted">
                      {r.branch?.name ? `${r.branch.name} · ` : ""}
                      <span className="font-mono font-semibold text-ink">{r.code}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-ink">Cómo funciona</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Pide como siempre",
              d: `${eligibleLabel}. Entra con tu cuenta y el pedido se registra a tu nombre.`,
            },
            {
              t: "Suma sellos y puntos",
              d: `${stampRuleLabel(rules)} — del mismo producto — y ${pointRuleLabel(rules)}.`,
            },
            {
              t: "Canjea",
              d: rules.expiryDays > 0
                ? `Sellos y puntos valen ${rules.expiryDays} días desde que los ganas.`
                : "Tus sellos y puntos no vencen: se guardan hasta que los uses.",
            },
          ].map((s, i) => (
            <li
              key={s.t}
              className="rounded-2xl border border-[var(--line)] bg-cream-soft p-5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-light">
                {i + 1}
              </span>
              <p className="mt-3 font-display text-lg font-semibold text-ink">{s.t}</p>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        {!session && (
          <p className="mt-4 text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login?next=%2Fclub-toby" className="text-accent-strong hover:underline">
              Inicia sesión
            </Link>{" "}
            para ver tus sellos.
          </p>
        )}
      </section>

      {/* Rewards shop */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-ink">Tienda de regalos</h2>
          <p className="text-sm text-muted">{pointRuleLabel(rules)}.</p>
        </div>
        {rewards.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] px-6 py-10 text-center text-sm text-muted">
            Estamos preparando los regalos. Vuelve pronto: tus puntos te están esperando.
          </p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => {
              const short = Math.max(0, r.costPoints - balances.points);
              return (
                <li
                  key={r.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-surface/80"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
                    <ProductImage src={r.image ?? undefined} alt={r.name} seed={r.slug} fit="contain" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-display text-lg font-semibold text-ink">{r.name}</p>
                    {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
                    <p className="mt-3 text-sm font-semibold text-accent-strong">{r.costPoints} puntos</p>
                    {session ? (
                      <RedeemButton
                        rewardId={r.id}
                        rewardName={r.name}
                        costPoints={r.costPoints}
                        pointsShort={short}
                        stock={r.stock}
                      />
                    ) : (
                      <Link
                        href="/login?next=%2Fclub-toby"
                        className="mt-3 w-full rounded-full border border-[var(--line-strong)] px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.1em] text-ink transition hover:border-accent hover:text-accent-strong"
                      >
                        Inicia sesión para canjear
                      </Link>
                    )}
                    {r.stock > 0 && r.stock <= 5 && (
                      <p className="mt-2 text-center text-xs text-muted">Quedan {r.stock}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Movement history */}
      {session && history.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-ink">Tus movimientos</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-surface/80 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-ink">
                  {movementLabel(h)}
                  {h.note && h.kind !== "ADJUST" && <span className="ml-2 text-muted">· {h.note}</span>}
                </span>
                <span className="shrink-0 text-muted">
                  {h.createdAt.toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
                </span>
                <span
                  className={`shrink-0 font-medium ${
                    h.stamps + h.points >= 0 ? "text-accent-strong" : "text-muted"
                  }`}
                >
                  {h.stamps !== 0 &&
                    `${h.stamps > 0 ? "+" : ""}${h.stamps} sello${Math.abs(h.stamps) === 1 ? "" : "s"}`}
                  {h.stamps !== 0 && h.points !== 0 && " · "}
                  {h.points !== 0 && `${h.points > 0 ? "+" : ""}${h.points} pts`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        {rules.name} es exclusivo de Toby ¡Mi Hamburguesa! y funciona en todas nuestras sucursales.
        Aplican los términos del programa.
      </p>
    </div>
  );
}

function StampCardView({ card }: { card: Card }) {
  const full = card.filled >= card.size;
  return (
    <div className="rounded-2xl border border-[var(--line-strong)] bg-surface/80 p-5">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <ProductImage src={card.image} alt={card.name} seed={card.slug} fit="contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{card.name}</p>
          <p className="text-xs text-muted">
            {full ? "Tarjeta completa: llévala gratis en tu próximo pedido" : `${card.filled} de ${card.size} sellos`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: card.size }, (_, i) => (
          <span
            key={i}
            className={`h-6 w-6 rounded-full border ${
              i < card.filled
                ? "border-accent bg-gradient-to-br from-accent-soft to-accent"
                : "border-dashed border-[var(--line-strong)] bg-transparent"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

// Reads the programme state for one shopper. Any failure (or a database without
// the loyalty tables yet) degrades to an empty card instead of a broken page.
type ClubData = {
  balances: Awaited<ReturnType<typeof getBalances>>;
  rewards: RewardRow[];
  cards: Card[];
  pending: PendingRow[];
  history: HistoryRow[];
};

async function loadClub(customerId: string | undefined, rules: LoyaltySettings): Promise<ClubData> {
  const empty: ClubData = {
    balances: { points: 0, stampsByProduct: {}, readyForRedemption: [], totalStamps: 0 },
    rewards: [],
    cards: [],
    pending: [],
    history: [],
  };
  if (!rules.enabled) return empty;
  try {
    const rewards = await prisma.reward.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { costPoints: "asc" }],
      select: { id: true, slug: true, name: true, description: true, image: true, costPoints: true, stock: true },
    });
    if (!customerId) return { ...empty, rewards };

    const [balances, history, pending] = await Promise.all([
      getBalances(customerId, rules),
      getHistory(customerId, 12),
      prisma.redemption.findMany({
        where: { customerId, status: { in: ["PENDING", "READY"] } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { code: true, rewardName: true, status: true, branch: { select: { name: true } } },
      }),
    ]);

    const ids = Object.entries(balances.stampsByProduct)
      .filter(([id, n]) => id !== "" && n > 0)
      .map(([id]) => id);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, name: true, slug: true, images: true },
    });
    const cards: Card[] = products
      .map((p) => {
        const card = stampCard(balances.stampsByProduct[p.id] ?? 0, rules);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          filled: card.filled,
          size: card.size,
        };
      })
      .sort((a, b) => b.filled / b.size - a.filled / a.size);

    return { balances, rewards, cards, pending, history };
  } catch {
    return empty;
  }
}

type RewardRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  costPoints: number;
  stock: number;
};
type PendingRow = { code: string; rewardName: string; status: string; branch: { name: string } | null };
type HistoryRow = Awaited<ReturnType<typeof getHistory>>[number];
