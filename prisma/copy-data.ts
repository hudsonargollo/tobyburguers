// Copies ALL store data from one PostgreSQL database to another — e.g. from the
// local dev DB to the new cloud DB (Neon / Netlify DB) before the first deploy.
//
//   SOURCE_DATABASE_URL="postgresql://…local…" TARGET_DATABASE_URL="postgresql://…cloud…" npm run db:copy
//
// - Run `npx prisma migrate deploy` against the TARGET first (creates the tables).
// - Safe to re-run: existing rows (same id) are skipped, nothing is deleted.
// - Copies: categories, products, admin users, customers, orders + items,
//   contact messages, subscribers. IDs are preserved so all links stay intact.

import { PrismaClient } from "@prisma/client";

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

if (!SOURCE || !TARGET) {
  console.error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL.");
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error("SOURCE and TARGET are the same database — nothing to do.");
  process.exit(1);
}

const src = new PrismaClient({ datasourceUrl: SOURCE });
const dst = new PrismaClient({ datasourceUrl: TARGET });

async function copy<T>(label: string, rows: T[], insert: (data: T[]) => Promise<{ count: number }>) {
  if (rows.length === 0) {
    console.log(`  ${label}: 0 rows`);
    return;
  }
  const { count } = await insert(rows);
  console.log(`  ${label}: ${count} copied (${rows.length - count} already there)`);
}

async function main() {
  console.log("Copying Toby ¡Mi Hamburguesa! data…");
  // Order matters: parents before children (foreign keys).
  await copy("categories", await src.category.findMany(), (data) =>
    dst.category.createMany({ data, skipDuplicates: true })
  );
  await copy("products", await src.product.findMany(), (data) =>
    dst.product.createMany({ data, skipDuplicates: true })
  );
  await copy("branches", await src.branch.findMany(), (data) =>
    dst.branch.createMany({ data, skipDuplicates: true })
  );
  await copy("branch stock", await src.branchStock.findMany(), (data) =>
    dst.branchStock.createMany({ data, skipDuplicates: true })
  );
  await copy("admin users", await src.user.findMany(), (data) =>
    dst.user.createMany({ data, skipDuplicates: true })
  );
  await copy("customers", await src.customer.findMany(), (data) =>
    dst.customer.createMany({ data, skipDuplicates: true })
  );
  await copy("orders", await src.order.findMany(), (data) =>
    dst.order.createMany({ data, skipDuplicates: true })
  );
  await copy("order items", await src.orderItem.findMany(), (data) =>
    dst.orderItem.createMany({ data, skipDuplicates: true })
  );
  await copy("contact messages", await src.contactMessage.findMany(), (data) =>
    dst.contactMessage.createMany({ data, skipDuplicates: true })
  );
  await copy("subscribers", await src.subscriber.findMany(), (data) =>
    dst.subscriber.createMany({ data, skipDuplicates: true })
  );
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
