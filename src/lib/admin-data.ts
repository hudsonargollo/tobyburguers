import { prisma } from "./prisma";
import { getStoreSettings } from "./settings";
import { ORDER_STATUSES } from "./order-status";

export type AdminStats = {
  dbConnected: boolean;
  products: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
  customers: number;
  lowStock: number;
  monthOrders: number;
  monthRevenue: number;
};

export async function getAdminStats(branchId?: string | null): Promise<AdminStats> {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const scope = branchId ? { branchId } : {};
    const low = (await getStoreSettings()).inventory.lowStockThreshold;

    const [products, orders, pendingOrders, revenueAgg, customers, lowStock, monthOrders, monthRevAgg] =
      await Promise.all([
        prisma.product.count(),
        prisma.order.count({ where: scope }),
        prisma.order.count({ where: { ...scope, status: "PENDING" } }),
        prisma.order.aggregate({ _sum: { total: true }, where: { ...scope, status: { not: "CANCELLED" } } }),
        branchId
          ? prisma.customer.count({ where: { orders: { some: { branchId } } } })
          : prisma.customer.count(),
        branchId
          ? prisma.branchStock.count({ where: { branchId, active: true, stock: { lte: low } } })
          : prisma.branchStock.count({ where: { active: true, stock: { lte: low } } }),
        prisma.order.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { ...scope, status: { not: "CANCELLED" }, createdAt: { gte: monthStart } },
        }),
      ]);
    return {
      dbConnected: true,
      products,
      orders,
      pendingOrders,
      revenue: Number(revenueAgg._sum.total ?? 0),
      customers,
      lowStock,
      monthOrders,
      monthRevenue: Number(monthRevAgg._sum.total ?? 0),
    };
  } catch {
    return {
      dbConnected: false, products: 0, orders: 0, pendingOrders: 0, revenue: 0,
      customers: 0, lowStock: 0, monthOrders: 0, monthRevenue: 0,
    };
  }
}

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orders: number;
  spent: number;
  createdAt: string;
};

export async function getAdminCustomers(branchId?: string | null): Promise<{
  dbConnected: boolean;
  customers: AdminCustomerRow[];
}> {
  try {
    const rows = await prisma.customer.findMany({
      where: branchId ? { orders: { some: { branchId } } } : undefined,
      include: { orders: { where: branchId ? { branchId } : undefined, select: { total: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      dbConnected: true,
      customers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        orders: c.orders.length,
        spent: c.orders
          .filter((o) => o.status !== "CANCELLED")
          .reduce((s, o) => s + Number(o.total), 0),
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch {
    return { dbConnected: false, customers: [] };
  }
}

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  products: number;
};

export async function getAdminCategories(): Promise<{
  dbConnected: boolean;
  categories: AdminCategoryRow[];
}> {
  try {
    const rows = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return {
      dbConnected: true,
      categories: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        products: c._count.products,
      })),
    };
  } catch {
    return { dbConnected: false, categories: [] };
  }
}

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  featured: boolean;
  active: boolean;
  category: string;
};

export async function getAdminProducts(branchId?: string | null): Promise<{
  dbConnected: boolean;
  products: AdminProduct[];
}> {
  try {
    const rows = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        branchStock: { where: branchId ? { branchId } : undefined, select: { stock: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      dbConnected: true,
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        stock: sumStock(p.branchStock),
        featured: p.featured,
        active: p.active,
        category: p.category.name,
      })),
    };
  } catch {
    return { dbConnected: false, products: [] };
  }
}

function sumStock(rows: { stock: number }[]): number {
  return rows.reduce((n, r) => n + Math.max(0, r.stock), 0);
}

export type AdminInventoryRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string;
  image: string | null;
  stock: number;
  available: boolean;
  catalogActive: boolean;
};

/** Per-branch stock for every active product in the shared catalog. */export async function getAdminInventory(
  branchId: string,
  q?: string
): Promise<{ dbConnected: boolean; rows: AdminInventoryRow[] }> {
  if (!branchId) return { dbConnected: true, rows: [] };
  try {
    const where = q
      ? {
          active: true,
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { brand: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : { active: true };
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        branchStock: { where: { branchId }, select: { stock: true, active: true } },
      },
      orderBy: { name: "asc" },
      take: 500,
    });
    return {
      dbConnected: true,
      rows: products.map((p) => {
        const row = p.branchStock[0];
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          category: p.category.name,
          image: p.images[0] ?? null,
          stock: Math.max(0, row?.stock ?? 0),
          available: row?.active ?? true,
          catalogActive: p.active,
        };
      }),
    };
  } catch {
    return { dbConnected: false, rows: [] };
  }
}

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  material: string | null;
  specs: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
  categoryId: string;
};

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  try {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice == null ? null : Number(p.compareAtPrice),
      sku: p.sku,
      material: p.material,
      specs: p.specs,
      images: p.images,
      featured: p.featured,
      active: p.active,
      categoryId: p.categoryId,
    };
  } catch {
    return null;
  }
}

export async function getCategoriesForSelect(): Promise<{ id: string; name: string; slug: string }[]> {
  try {
    return await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  branchName: string;
  fulfillment: string;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  itemCount: number;
};

export async function getAdminOrders(branchId?: string | null): Promise<{
  dbConnected: boolean;
  orders: AdminOrderRow[];
}> {
  try {
    const rows = await prisma.order.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        items: { select: { quantity: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      dbConnected: true,
      orders: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        branchName: o.branch.name,
        fulfillment: o.fulfillment,
        total: Number(o.total),
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
      })),
    };
  } catch {
    return { dbConnected: false, orders: [] };
  }
}

export async function getAdminOrder(id: string, branchId?: string | null) {
  try {
    const o = await prisma.order.findUnique({
      where: { id },
      include: { items: true, branch: true },
    });
    if (!o) return null;
    // Staff can only open orders belonging to their branch.
    if (branchId && o.branchId !== branchId) return null;
    return {
      ...o,
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      total: Number(o.total),
      branch: {
        ...o.branch,
        flatFee: null,
        freeThreshold: null,
      },
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({ ...i, price: Number(i.price) })),
    };
  } catch {
    return null;
  }
}

/* ─────────────────────────  Sales analytics  ───────────────────────── */

export type SalesPoint = { label: string; revenue: number; orders: number };
export type SalesRange = {
  points: SalesPoint[];
  totalRevenue: number;
  totalOrders: number;
  avgOrder: number;
  changePct: number | null; // vs the immediately-preceding window of equal length
  peak: number;
};
export type SalesInsights = {
  dbConnected: boolean;
  day: SalesRange;
  month: SalesRange;
  year: SalesRange;
};

type Row = { t: Date; v: number };

function summarize(
  points: SalesPoint[],
  total: number,
  count: number,
  prevTotal: number
): SalesRange {
  const peak = points.reduce((m, p) => Math.max(m, p.revenue), 0);
  let changePct: number | null;
  if (prevTotal > 0) changePct = Math.round(((total - prevTotal) / prevTotal) * 100);
  else changePct = total > 0 ? 100 : null;
  return {
    points,
    totalRevenue: total,
    totalOrders: count,
    avgOrder: count > 0 ? Math.round(total / count) : 0,
    changePct,
    peak,
  };
}

function sumBetween(rows: Row[], start: Date, end: Date): number {
  let s = 0;
  for (const r of rows) if (r.t >= start && r.t < end) s += r.v;
  return s;
}

function buildDay(rows: Row[]): SalesRange {
  const N = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: SalesPoint[] = [];
  let total = 0;
  let count = 0;
  for (let i = N - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    let rev = 0;
    let ord = 0;
    for (const r of rows)
      if (r.t >= day && r.t < next) {
        rev += r.v;
        ord++;
      }
    points.push({
      label: day.toLocaleDateString("es-BO", { day: "numeric", month: "short" }),
      revenue: rev,
      orders: ord,
    });
    total += rev;
    count += ord;
  }
  const prevStart = new Date(today);
  prevStart.setDate(today.getDate() - 2 * N + 1);
  const curStart = new Date(today);
  curStart.setDate(today.getDate() - N + 1);
  return summarize(points, total, count, sumBetween(rows, prevStart, curStart));
}

function buildMonth(rows: Row[]): SalesRange {
  const N = 12;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  const points: SalesPoint[] = [];
  let total = 0;
  let count = 0;
  for (let i = N - 1; i >= 0; i--) {
    const m = new Date(base);
    m.setMonth(base.getMonth() - i);
    const next = new Date(m);
    next.setMonth(m.getMonth() + 1);
    let rev = 0;
    let ord = 0;
    for (const r of rows)
      if (r.t >= m && r.t < next) {
        rev += r.v;
        ord++;
      }
    points.push({
      label: m.toLocaleDateString("es-BO", { month: "short" }),
      revenue: rev,
      orders: ord,
    });
    total += rev;
    count += ord;
  }
  const prevStart = new Date(base);
  prevStart.setMonth(base.getMonth() - 2 * N + 1);
  const curStart = new Date(base);
  curStart.setMonth(base.getMonth() - N + 1);
  return summarize(points, total, count, sumBetween(rows, prevStart, curStart));
}

function buildYear(rows: Row[]): SalesRange {
  const N = 5;
  const nowY = new Date().getFullYear();
  const points: SalesPoint[] = [];
  let total = 0;
  let count = 0;
  for (let i = N - 1; i >= 0; i--) {
    const y = nowY - i;
    const start = new Date(y, 0, 1);
    const next = new Date(y + 1, 0, 1);
    let rev = 0;
    let ord = 0;
    for (const r of rows)
      if (r.t >= start && r.t < next) {
        rev += r.v;
        ord++;
      }
    points.push({ label: String(y), revenue: rev, orders: ord });
    total += rev;
    count += ord;
  }
  const prevStart = new Date(nowY - 2 * N + 1, 0, 1);
  const curStart = new Date(nowY - N + 1, 0, 1);
  return summarize(points, total, count, sumBetween(rows, prevStart, curStart));
}

export type DailyPoint = { time: string; revenue: number; orders: number };

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Continuous daily series (zero-filled) for the Amazon/Keepa-style zoomable chart.
export async function getSalesDaily(
  days = 365,
  branchId?: string | null
): Promise<{ dbConnected: boolean; points: DailyPoint[] }> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const orders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: start }, ...(branchId ? { branchId } : {}) },
      select: { createdAt: true, total: true },
    });
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const key = ymd(o.createdAt);
      const cur = map.get(key) || { revenue: 0, orders: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      map.set(key, cur);
    }
    const points: DailyPoint[] = [];
    const d = new Date(start);
    for (let i = 0; i < days; i++) {
      const key = ymd(d);
      const v = map.get(key) || { revenue: 0, orders: 0 };
      points.push({ time: key, revenue: v.revenue, orders: v.orders });
      d.setDate(d.getDate() + 1);
    }
    return { dbConnected: true, points };
  } catch {
    return { dbConnected: false, points: [] };
  }
}

export type StorePerformance = {
  dbConnected: boolean;
  fulfillmentPct: number;
  delivered: number;
  totalOrders: number;
  paymentPct: number;
  paid: number;
  stockPct: number;
  inStock: number;
  totalProducts: number;
};

export async function getStorePerformance(branchId?: string | null): Promise<StorePerformance> {
  try {
    const scope = branchId ? { branchId } : {};
    const low = (await getStoreSettings()).inventory.lowStockThreshold;
    const [totalOrders, delivered, paid, totalProducts, inStock] = await Promise.all([
      prisma.order.count({ where: { ...scope, status: { not: "CANCELLED" } } }),
      prisma.order.count({ where: { ...scope, status: "DELIVERED" } }),
      prisma.order.count({ where: { ...scope, paymentStatus: "PAID", status: { not: "CANCELLED" } } }),
      prisma.product.count({ where: { active: true } }),
      prisma.branchStock.count({ where: { ...(branchId ? { branchId } : {}), active: true, stock: { gt: low } } }),
    ]);
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return {
      dbConnected: true,
      fulfillmentPct: pct(delivered, totalOrders),
      delivered,
      totalOrders,
      paymentPct: pct(paid, totalOrders),
      paid,
      stockPct: pct(inStock, totalProducts),
      inStock,
      totalProducts,
    };
  } catch {
    return {
      dbConnected: false,
      fulfillmentPct: 0, delivered: 0, totalOrders: 0,
      paymentPct: 0, paid: 0,
      stockPct: 0, inStock: 0, totalProducts: 0,
    };
  }
}

export async function getSalesInsights(branchId?: string | null): Promise<SalesInsights> {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, ...(branchId ? { branchId } : {}) },
      select: { createdAt: true, total: true },
    });
    const rows: Row[] = orders.map((o) => ({ t: o.createdAt, v: Number(o.total) }));
    return {
      dbConnected: true,
      day: buildDay(rows),
      month: buildMonth(rows),
      year: buildYear(rows),
    };
  } catch {
    const empty: SalesRange = {
      points: [],
      totalRevenue: 0,
      totalOrders: 0,
      avgOrder: 0,
      changePct: null,
      peak: 0,
    };
    return { dbConnected: false, day: empty, month: empty, year: empty };
  }
}

/* ─────────────────────  Dashboard breakdowns  ───────────────────── */

export type TopProduct = {
  productId: string;
  name: string;
  slug: string | null;
  image: string | null;
  units: number;
  revenue: number;
};
export type CategorySales = { name: string; revenue: number; share: number };

export async function getSalesBreakdown(branchId?: string | null): Promise<{
  dbConnected: boolean;
  topProducts: TopProduct[];
  categories: CategorySales[];
}> {
  try {
    const items = await prisma.orderItem.findMany({
      where: {
        order: { status: { not: "CANCELLED" }, ...(branchId ? { branchId } : {}) },
      },
      select: {
        productId: true,
        name: true,
        price: true,
        quantity: true,
        product: { select: { slug: true, images: true, category: { select: { name: true } } } },
      },
    });
    const prodMap = new Map<string, TopProduct>();
    const catMap = new Map<string, number>();
    let totalRev = 0;
    for (const it of items) {
      const rev = Number(it.price) * it.quantity;
      totalRev += rev;
      const cur =
        prodMap.get(it.productId) ??
        {
          productId: it.productId,
          name: it.name,
          slug: it.product?.slug ?? null,
          image: it.product?.images?.[0] ?? null,
          units: 0,
          revenue: 0,
        };
      cur.units += it.quantity;
      cur.revenue += rev;
      prodMap.set(it.productId, cur);
      const cat = it.product?.category?.name ?? "Otros";
      catMap.set(cat, (catMap.get(cat) ?? 0) + rev);
    }
    const topProducts = [...prodMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const categories = [...catMap.entries()]
      .map(([name, revenue]) => ({
        name,
        revenue,
        share: totalRev > 0 ? Math.round((revenue / totalRev) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
    return { dbConnected: true, topProducts, categories };
  } catch {
    return { dbConnected: false, topProducts: [], categories: [] };
  }
}

export type StatusCount = { status: string; count: number };

export async function getOrderStatusBreakdown(branchId?: string | null): Promise<{
  dbConnected: boolean;
  counts: StatusCount[];
  total: number;
}> {
  try {
    const grouped = await prisma.order.groupBy({
      by: ["status"],
      where: branchId ? { branchId } : undefined,
      _count: { status: true },
    });
    const map = new Map(grouped.map((g) => [g.status as string, g._count.status]));
    const counts = ORDER_STATUSES.map((s) => ({ status: s, count: map.get(s) ?? 0 }));
    const total = counts.reduce((n, c) => n + c.count, 0);
    return { dbConnected: true, counts, total };
  } catch {
    return { dbConnected: false, counts: [], total: 0 };
  }
}

export type PaymentSlice = {
  method: string;
  label: string;
  orders: number;
  revenue: number;
  share: number;
};

export async function getPaymentBreakdown(branchId?: string | null): Promise<{
  dbConnected: boolean;
  methods: PaymentSlice[];
  total: number;
}> {
  try {
    const grouped = await prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { status: { not: "CANCELLED" }, ...(branchId ? { branchId } : {}) },
      _sum: { total: true },
      _count: true,
    });
    const totalRev = grouped.reduce((s, g) => s + Number(g._sum.total ?? 0), 0);
    const LABELS: Record<string, string> = {
      COD: "Pago contra entrega",
      PAYFAST: "Tarjeta (PayFast)",
      SAFEPAY: "Safepay",
    };
    const methods = grouped
      .map((g) => {
        const revenue = Number(g._sum.total ?? 0);
        return {
          method: g.paymentMethod as string,
          label: LABELS[g.paymentMethod as string] ?? (g.paymentMethod as string),
          orders: g._count,
          revenue,
          share: totalRev > 0 ? Math.round((revenue / totalRev) * 100) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    return { dbConnected: true, methods, total: totalRev };
  } catch {
    return { dbConnected: false, methods: [], total: 0 };
  }
}

export async function getRecentCustomers(limit = 5, branchId?: string | null): Promise<{
  dbConnected: boolean;
  customers: AdminCustomerRow[];
}> {
  try {
    const rows = await prisma.customer.findMany({
      where: branchId ? { orders: { some: { branchId } } } : undefined,
      include: {
        orders: { where: branchId ? { branchId } : undefined, select: { total: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return {
      dbConnected: true,
      customers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        orders: c.orders.length,
        spent: c.orders
          .filter((o) => o.status !== "CANCELLED")
          .reduce((s, o) => s + Number(o.total), 0),
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch {
    return { dbConnected: false, customers: [] };
  }
}

/* ─────────────────────────  Branches  ───────────────────────── */

export type AdminBranchRow = {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  image: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  flatFee: number | null;
  freeThreshold: number | null;
  active: boolean;
  sortOrder: number;
  orders: number;
  products: number;
  users: number;
};

function branchRow(b: {
  id: string; name: string; slug: string; code: string; address: string; city: string;
  phone: string | null; whatsapp: string | null; hours: string | null; image: string | null;
  mapsUrl: string | null; latitude: number | null; longitude: number | null;
  deliveryEnabled: boolean; pickupEnabled: boolean;
  flatFee: unknown; freeThreshold: unknown; active: boolean; sortOrder: number;
  _count: { orders: number; stock: number; users: number };
}): AdminBranchRow {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    code: b.code,
    address: b.address,
    city: b.city,
    phone: b.phone,
    whatsapp: b.whatsapp,
    hours: b.hours,
    image: b.image,
    mapsUrl: b.mapsUrl,
    latitude: b.latitude,
    longitude: b.longitude,
    deliveryEnabled: b.deliveryEnabled,
    pickupEnabled: b.pickupEnabled,
    flatFee: b.flatFee == null ? null : Number(b.flatFee),
    freeThreshold: b.freeThreshold == null ? null : Number(b.freeThreshold),
    active: b.active,
    sortOrder: b.sortOrder,
    orders: b._count.orders,
    products: b._count.stock,
    users: b._count.users,
  };
}

export async function getAdminBranches(): Promise<{
  dbConnected: boolean;
  branches: AdminBranchRow[];
}> {
  try {
    const rows = await prisma.branch.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { orders: true, stock: true, users: true } } },
    });
    return { dbConnected: true, branches: rows.map(branchRow) };
  } catch {
    return { dbConnected: false, branches: [] };
  }
}

export async function getAdminBranch(id: string): Promise<AdminBranchRow | null> {
  try {
    const b = await prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, stock: true, users: true } } },
    });
    return b ? branchRow(b) : null;
  } catch {
    return null;
  }
}
