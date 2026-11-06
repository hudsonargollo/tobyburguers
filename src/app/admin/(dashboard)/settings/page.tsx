import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStoreSettings } from "@/lib/settings";
import { getBranches } from "@/lib/branch";
import { DbBanner } from "@/components/admin/db-banner";
import { DeleteButton } from "@/components/admin/delete-button";
import { StoreSettingsForms, PasswordForm, AddTeamMemberForm } from "@/components/admin/settings-forms";
import { removeTeamMember, setTeamMemberBranch } from "./actions";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "contact", label: "Contacto" },
  { id: "social", label: "Redes sociales" },
  { id: "shipping", label: "Envío" },
  { id: "announcements", label: "Barra de anuncios" },
  { id: "alerts", label: "Alertas" },
  { id: "account", label: "Mi cuenta" },
  { id: "team", label: "Equipo" },
];

async function loadTeam() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    });
    return { dbConnected: true, users };
  } catch {
    return { dbConnected: false, users: [] };
  }
}

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const [settings, team, branches] = await Promise.all([getStoreSettings(), loadTeam(), getBranches()]);
  const isOwner = session.role === "ADMIN";
  const adminCount = team.users.filter((u) => u.role === "ADMIN").length;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Ajustes</h1>
      <p className="mt-1 text-sm text-muted">
        Datos de la tienda, envío, la barra de anuncios, tu contraseña y tu equipo. Los cambios se
        aplican en la tienda al instante.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Secciones de ajustes">
        {SECTIONS.map((s) => (
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
        {!team.dbConnected && <DbBanner />}
        {!isOwner && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Has iniciado sesión como <strong>personal</strong>: solo un administrador puede cambiar los
            ajustes de la tienda y el equipo. Aún puedes cambiar tu propia contraseña abajo.
          </p>
        )}

        <StoreSettingsForms settings={settings} canEdit={isOwner} />
        <PasswordForm />

        {/* Team */}
        <section
          id="team"
          className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(110,10,6,0.4)] sm:p-6"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Equipo</h2>
          <p className="mt-1 text-sm text-muted">
            Personas que pueden iniciar sesión en este panel. Cada miembro del personal entra
            únicamente a su sucursal; los administradores ven todas.
          </p>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {team.users.map((u) => {
              const isSelf = u.email === session.email;
              const lastAdmin = u.role === "ADMIN" && adminCount <= 1;
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {u.name || u.email}
                      {isSelf && <span className="ml-2 text-xs font-normal text-muted">(tú)</span>}
                    </p>
                    <p className="text-xs text-muted">{u.email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <span className="font-medium text-ink-soft">Sucursal:</span>
                      {u.role === "ADMIN" ? "Todas las sucursales" : u.branch?.name ?? "Sin asignar"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.role === "ADMIN" ? "bg-brand text-accent" : "bg-cream-soft text-ink"
                      }`}
                    >
                      {u.role === "ADMIN" ? "Administrador" : "Personal"}
                    </span>
                    {isOwner && u.role === "STAFF" && branches.length > 0 && (
                      <form action={setTeamMemberBranch.bind(null, u.id)} className="flex items-center gap-2">
                        <select
                          name="branchId"
                          defaultValue={u.branch?.id ?? ""}
                          aria-label={`Sucursal de ${u.email}`}
                          className="rounded-lg border border-[var(--line-strong)] bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                        >
                          {!u.branch && <option value="">Elige sucursal…</option>}
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-[var(--line-strong)] px-2.5 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent-strong"
                        >
                          Mover
                        </button>
                      </form>
                    )}
                    {isOwner && !isSelf && !lastAdmin && (
                      <DeleteButton
                        action={removeTeamMember.bind(null, u.id)}
                        label="Quitar"
                        confirmText={`¿Quitar a ${u.email} del equipo? Ya no podrá iniciar sesión.`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner && <AddTeamMemberForm branches={branches} />}
      </div>
    </div>
  );
}
