import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStoreSettings } from "@/lib/settings";
import { getBalances, getHistory } from "@/lib/loyalty";
import { movementLabel, pointRuleLabel, stampCard, stampRuleLabel } from "@/lib/loyalty-shared";
import { formatDate } from "@/lib/format";
import { AdjustForm, LoyaltyRulesForm, RewardForm, type RewardRow } from "@/components/admin/loyalty-forms";
import { setRedemptionStatus, setRewardActive } from "./actions";

export const metadata = { title: "Club" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pedido",
  READY: "Listo en caja",
  COLLECTED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_CHIP: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  READY: "bg-blue-100 text-blue-900",
  COLLECTED: "bg-green-100 text-green-900",
  CANCELLED: "bg-red-100 text-red-800",
};

async function loadRewards(): Promise<RewardRow[]> {
  try {
    return await prisma.reward.findMany({
      orderBy: [{ order: "asc" }, { costPoints: "asc" }],
      select: { id: true, slug: true, name: true, description: true, image: true, costPoints: true, stock: true, active: true, order: true },
    });
  } catch {
    return [];
  }
}

export default async function AdminLoyaltyPage({ searchParams }: PageProps<"/admin/loyalty">) {
  const session = await requireAdmin();
  const canEdit = session.role === "ADMIN";
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const selected = (Array.isArray(sp.cliente) ? sp.cliente[0] : sp.cliente ?? "").trim();

  const settings = await getStoreSettings();
  const rules = settings.loyalty;

  const [categories, products, rewards, redemptions, counts, customerRows] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }).catch(() => []),
    prisma.product
      .findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } })
      .catch(() => []),
    loadRewards(),
    prisma.redemption
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          code: true,
          rewardName: true,
          costPoints: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
          branch: { select: { name: true } },
        },
      })
      .catch(() => []),
    prisma.redemption
      .groupBy({ by: ["status"], _count: { _all: true } })
      .catch(() => [] as { status: string; _count: { _all: number } }[]),
    prisma.customer
      .findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : { loyaltyEntries: { some: {} } },
        orderBy: { updatedAt: "desc" },
        take: 25,
        select: { id: true, name: true, email: true },
      })
      .catch(() => []),
  ]);

  const balanceByCustomer = new Map<string, { stamps: number; points: number }>();
  try {
    const grouped = await prisma.loyaltyEntry.groupBy({
      by: ["customerId"],
      _sum: { stamps: true, points: true },
    });
    for (const g of grouped)
      balanceByCustomer.set(g.customerId, { stamps: g._sum.stamps ?? 0, points: g._sum.points ?? 0 });
  } catch {
    // no table yet (migration pending) — the list simply shows zeros
  }

  const picked = selected ? customerRows.find((c) => c.id === selected) ?? null : null;
  const [pickedBalances, pickedHistory] = picked
    ? await Promise.all([getBalances(picked.id, rules).catch(() => null), getHistory(picked.id, 10).catch(() => [])])
    : [null, []];

  const pendingCount = counts.find((c) => c.status === "PENDING")?._count._all ?? 0;
  const members = balanceByCustomer.size;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">{rules.name}</h1>
      <p className="mt-1 text-sm text-muted">
        Sellos, puntos y regalos canjeables. {stampRuleLabel(rules)} · {pointRuleLabel(rules)}.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Secciones del club">
        {[
          { id: "reglas", label: "Reglas" },
          { id: "regalos", label: "Regalos" },
          { id: "canjes", label: `Canjes (${pendingCount})` },
          { id: "clientes", label: "Clientes" },
        ].map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent-strong"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {!canEdit && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Has iniciado sesión como <strong>personal</strong>: puedes preparar y entregar canjes, pero
            solo un administrador cambia las reglas, los regalos y los saldos.
          </p>
        )}

        <LoyaltyRulesForm
          rules={rules}
          categories={categories}
          products={products.map((p) => ({ slug: p.slug, name: p.name }))}
          canEdit={canEdit}
        />

        {/* Rewards catalogue */}
        <section
          id="regalos"
          className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Regalos canjeables</h2>
          <p className="mt-1 text-sm text-muted">
            {members} cliente{members === 1 ? "" : "s"} con saldos. Un regalo sin stock aparece como
            «Agotado» en la tienda y nadie puede canjearlo.
          </p>
          <div className="mt-4 space-y-3">
            {rewards.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {canEdit ? (
                    <RewardForm reward={r} canEdit={canEdit} />
                  ) : (
                    <p className="text-sm text-ink">
                      {r.name} · {r.costPoints} pts · {r.stock} en stock
                      {!r.active && <span className="text-muted"> · oculto</span>}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <form action={setRewardActive.bind(null, r.id, !r.active)} className="shrink-0">
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent-strong"
                    >
                      {r.active ? "Ocultar de la tienda" : "Volver a mostrar"}
                    </button>
                  </form>
                )}
              </div>
            ))}
            {rewards.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-muted">
                Todavía no hay regalos.{" "}
                {canEdit ? "Añade el primero abajo." : "Un administrador puede añadirlos."}
              </p>
            )}
            {canEdit && <RewardForm canEdit={canEdit} />}
          </div>
        </section>

        {/* Redemption counter */}
        <section
          id="canjes"
          className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Canjes para entregar</h2>
          <p className="mt-1 text-sm text-muted">
            El cliente muestra el código en caja. «Cancelar» devuelve el regalo al stock y los puntos al
            cliente.
          </p>
          {redemptions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-muted">
              Todavía nadie canjeó un regalo.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {redemptions.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {r.rewardName}{" "}
                      <span className="font-mono text-xs text-muted">{r.code}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {r.customer.name} · {r.customer.email} · {r.costPoints} pts ·{" "}
                      {r.branch?.name ?? "sin sucursal"} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[r.status] ?? "bg-cream-soft text-ink"}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {(["READY", "COLLECTED", "CANCELLED"] as const)
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <form key={s} action={setRedemptionStatus.bind(null, r.id, s)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-[var(--line-strong)] px-2.5 py-1 text-xs font-medium text-ink transition hover:border-accent hover:text-accent-strong"
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        </form>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Customers */}
        <section
          id="clientes"
          className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Saldos por cliente</h2>
          <p className="mt-1 text-sm text-muted">
            Busca por nombre o correo y elige a alguien para ver sus tarjetas o corregir su saldo.
          </p>
          <form className="mt-4 flex flex-wrap gap-2" action="/admin/loyalty">
            {picked && <input type="hidden" name="cliente" value={picked.id} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Nombre o correo…"
              className="w-full max-w-xs rounded-lg border border-[var(--line-strong)] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-accent-soft"
            >
              Buscar
            </button>
          </form>

          {customerRows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-muted">
              {q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes con sellos o puntos."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {customerRows.map((c) => {
                const b = balanceByCustomer.get(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-muted">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        {b?.stamps ?? 0} sellos · {b?.points ?? 0} pts
                      </span>
                      <a
                        href={`/admin/loyalty?cliente=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent-strong"
                      >
                        Ver y ajustar
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {picked && pickedBalances && (
            <div className="mt-6 space-y-4 rounded-2xl border border-[var(--line-strong)] bg-cream-soft/60 p-4">
              <div>
                <p className="font-display text-lg font-semibold text-ink">
                  {picked.name} · {pickedBalances.points} pts
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {Object.entries(pickedBalances.stampsByProduct)
                    .filter(([id, n]) => id !== "" && n > 0)
                    .map(([id, n]) => {
                      const p = products.find((x) => x.id === id);
                      const card = stampCard(n, rules);
                      return (
                        <span
                          key={id}
                          className={`rounded-full border px-2.5 py-1 ${
                            card.full
                              ? "border-accent bg-accent/15 text-ink"
                              : "border-[var(--line-strong)] text-muted"
                          }`}
                        >
                          {p?.name ?? "Producto"}: {card.filled}/{card.size}
                          {card.full && " · lista"}
                        </span>
                      );
                    })}
                  {Object.values(pickedBalances.stampsByProduct).filter((n) => n > 0).length === 0 && (
                    <span className="text-muted">Sin sellos activos.</span>
                  )}
                </div>
              </div>

              {pickedHistory.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted">
                  {pickedHistory.map((h) => (
                    <li key={h.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {movementLabel(h)}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {h.stamps !== 0 && `${h.stamps > 0 ? "+" : ""}${h.stamps} sellos`}
                        {h.stamps !== 0 && h.points !== 0 && " · "}
                        {h.points !== 0 && `${h.points > 0 ? "+" : ""}${h.points} pts`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <AdjustForm
                  customerId={picked.id}
                  products={products.map((p) => ({ id: p.id, name: p.name }))}
                  canEdit={canEdit}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
