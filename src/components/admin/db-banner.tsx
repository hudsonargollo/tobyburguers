export function DbBanner() {
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Base de datos no conectada.</strong> Los datos y cambios del panel necesitan una base de datos
      PostgreSQL activa. Configura <code>DATABASE_URL</code> en <code>.env</code> y luego ejecuta{" "}
      <code>npx prisma migrate dev</code> y <code>npm run db:seed</code>.
    </div>
  );
}
