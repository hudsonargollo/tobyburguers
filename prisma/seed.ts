import { PrismaClient, Prisma } from "@prisma/client";

type SeedProduct = {
  name: string;
  slug: string;
  sku?: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  material?: string;
  brand: string;
  categorySlug: string;
  contents?: string;
  details?: string;
  stock: number;
  images: string[];
  featured?: boolean;
};

const prisma = new PrismaClient();

// Toby ¡Mi Hamburguesa! — catalog taken from the published menu (toby.clubemkt.digital/menu).
// Prices are the chain's "venta en local" prices in Bs.
// Categories are auto-created from the product data; duplicates are skipped.

const categories: { name: string; slug: string; description: string; image: string }[] = [
  { name: "Línea Premium", slug: "premium", description: "Las dobles de la casa: pan brioche, doble carne y cheddar.", image: "/imgs/categoria-premium.webp" },
  { name: "Express", slug: "express", description: "La de todos los días, lista rápido y al precio de siempre.", image: "/imgs/categoria-express.webp" },
  { name: "Clásicas y combos", slug: "clasicas", description: "Las hamburguesas que hicieron conocer a Toby, en combo con papas y gaseosa.", image: "/imgs/categoria-clasicas.webp" },
  { name: "En plato", slug: "plato", description: "Hamburguesa simple servida en plato, con ensalada y arroz.", image: "/imgs/categoria-plato.webp" },
  { name: "Sándwiches Philly", slug: "philly", description: "Sándwich philly en pan largo, con champiñones y queso.", image: "/imgs/categoria-philly.webp" },
  { name: "Boxy Toby", slug: "boxy", description: "Caja Boxy para llevar: hamburguesa o nuggets con papas y gaseosa.", image: "/imgs/categoria-boxy.webp" },
  { name: "Pollo", slug: "pollo", description: "Broaster, brasa, pipocas y baldes para compartir.", image: "/imgs/categoria-pollo.webp" },
  { name: "Nuggets y alitas", slug: "nuggets-alitas", description: "Nuggets y alitas crocantes, con salsa y papas.", image: "/imgs/categoria-nuggets-alitas.webp" },
  { name: "Postres", slug: "postres", description: "Conos, fruggys, milk shakes y sundae para cerrar.", image: "/imgs/categoria-postres.webp" },
];

const LOCAL_PRICES = "Precio de venta en local";

const products: SeedProduct[] = [
  { name: "Toby Cheese Doble", slug: "toby-cheese-doble", description: "Pan brioche, doble carne, queso cheddar y pepinillo", price: 61, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Toby Cheese Doble + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 45. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-cheese-doble.webp", "/imgs/menu/escena-toby-cheese-doble.webp"], featured: true },
  { name: "Bacon-T Doble", slug: "bacon-t-doble", description: "Pan brioche, doble carne, queso cheddar, tocino y pepinillo", price: 64, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Bacon-T Doble + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 48. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/bacon-t-doble.webp", "/imgs/menu/escena-bacon-t-doble.webp"], featured: true },
  { name: "Toby Crocker Doble", slug: "toby-crocker-doble", description: "Pan brioche, doble carne, queso cheddar, pepinillo y cebolla crocante", price: 63, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Crocker Doble + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 47. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-crocker-doble.webp", "/imgs/menu/escena-toby-crocker-doble.webp"], featured: true },
  { name: "Toby Cheese", slug: "toby-cheese", description: "Pan brioche, carne, queso cheddar y pepinillo", price: 49, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Toby Cheese + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 34. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-cheese.webp", "/imgs/menu/escena-toby-cheese.webp"], featured: true },
  { name: "Bacon-T", slug: "bacon-t", description: "Pan brioche, carne, queso cheddar, tocino y pepinillo", price: 51, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Bacon-T + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 37. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/bacon-t.webp", "/imgs/menu/escena-bacon-t.webp"], featured: true },
  { name: "Toby Crocker", slug: "toby-crocker", description: "Pan brioche, carne, queso cheddar, pepinillo y cebolla crocante", price: 50, brand: "Toby", categorySlug: "premium", material: "Combo", contents: "Hamburguesa Crocker + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 36. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-crocker.webp", "/imgs/menu/escena-toby-crocker.webp"], featured: true },
  { name: "Combo Toby Express", slug: "hamburguesa-express", description: "Hamburguesa express con pan de sésamo, queso, lechuga y tomate", price: 51, brand: "Toby", categorySlug: "express", material: "Combo", contents: "Hamburguesa Express + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 34. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/hamburguesa-express.webp", "/imgs/menu/escena-hamburguesa-express.webp"], featured: false },
  { name: "Combo Clásica Toby", slug: "clasica-toby", description: "Hamburguesa clásica con pan de sésamo, queso, lechuga, tomate y pepinillo", price: 55, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Clásica + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 38. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/clasica-toby.webp", "/imgs/menu/escena-clasica-toby.webp"], featured: true },
  { name: "Combo Cuarto de Libra", slug: "cuarto-de-libra", description: "Hamburguesa cuarto de libra con queso, cebolla, lechuga y tomate", price: 61, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Cuarto Libra + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 45. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/cuarto-de-libra.webp", "/imgs/menu/escena-cuarto-de-libra.webp"], featured: true },
  { name: "Combo Doble Toby", slug: "doble-toby", description: "Doble carne con queso, lechuga y tomate", price: 63, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Doble Toby + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 45. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/doble-toby.webp", "/imgs/menu/escena-doble-toby.webp"], featured: true },
  { name: "Combo Trimax", slug: "trimax", description: "Hamburguesa triple con queso", price: 70, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Triple + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 52. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/trimax.webp", "/imgs/menu/escena-trimax.webp"], featured: false },
  { name: "Combo Picanha", slug: "picanha", description: "Picanha de 150 gr con queso, tocino, tomate y lechuga", price: 68, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Picanha 150gr + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 53. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/picanha.webp", "/imgs/menu/escena-picanha.webp"], featured: false },
  { name: "Combo Toby Salame", slug: "toby-salame", description: "Doble carne con salame, queso y cebolla", price: 55, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Salame + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 42. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-salame.webp", "/imgs/menu/escena-toby-salame.webp"], featured: true },
  { name: "Combo Tri Toby", slug: "tri-toby", description: "Triple carne con pimientos y cebolla", price: 56, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Tri Toby + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 40. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/tri-toby.webp", "/imgs/menu/escena-tri-toby.webp"], featured: true },
  { name: "Combo Italiana", slug: "italiana", description: "Hamburguesa con jamón y queso", price: 54, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Italiana + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 37. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/italiana.webp", "/imgs/menu/escena-italiana.webp"], featured: true },
  { name: "Combo Toby Huevo", slug: "toby-huevo", description: "Hamburguesa con huevo y queso", price: 56, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Toby Huevo + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 39. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-huevo.webp", "/imgs/menu/escena-toby-huevo.webp"], featured: true },
  { name: "Combo Deli Toby", slug: "deli-toby", description: "Hamburguesa con cebolla y queso", price: 54, brand: "Toby", categorySlug: "clasicas", material: "Combo", contents: "Hamburguesa Deli Toby + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 38. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/deli-toby.webp", "/imgs/menu/escena-deli-toby.webp"], featured: true },
  { name: "Toby en Plato", slug: "toby-en-plato", description: "Hamburguesa simple servida en plato", price: 29, brand: "Toby", categorySlug: "plato", material: "En plato", contents: "Hamburguesa simple + ensalada + porción de arroz", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/toby-en-plato.webp", "/imgs/menu/escena-toby-en-plato.webp"], featured: false },
  { name: "Combo Philly de Pollo", slug: "philly-de-pollo", description: "Sándwich philly de pollo con champiñones y queso", price: 53, brand: "Toby", categorySlug: "philly", material: "Combo", contents: "Sándwich Philly Pollo + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 42. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/philly-de-pollo.webp", "/imgs/menu/escena-philly-de-pollo.webp"], featured: false },
  { name: "Combo Philly de Carne", slug: "philly-de-carne", description: "Sándwich philly de carne con champiñones y queso", price: 53, brand: "Toby", categorySlug: "philly", material: "Combo", contents: "Sándwich Philly Carne + papas fritas + vaso de gaseosa", details: "Sólo la hamburguesa: Bs 42. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/philly-de-carne.webp", "/imgs/menu/escena-philly-de-carne.webp"], featured: false },
  { name: "Boxy Toby (hamburguesa)", slug: "boxy-toby-hamburguesa", description: "Caja Boxy con hamburguesa simple y gaseosa 300 ml", price: 52, brand: "Toby", categorySlug: "boxy", material: "Combo", contents: "Hamburguesa simple + papas fritas + gaseosa 300 ml", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/boxy-toby-hamburguesa.webp", "/imgs/menu/escena-boxy-toby-hamburguesa.webp"], featured: false },
  { name: "Boxy Toby (nuggets)", slug: "boxy-toby-nuggets", description: "Caja Boxy con nuggets y gaseosa 300 ml", price: 51, brand: "Toby", categorySlug: "boxy", material: "Combo", contents: "4 nuggets + papas fritas + gaseosa 300 ml", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/boxy-toby-nuggets.webp", "/imgs/menu/escena-boxy-toby-nuggets.webp"], featured: false },
  { name: "Pollo Broaster", slug: "pollo-broaster-cuarto", description: "1/4 de pollo a la broaster con papas y arroz", price: 36, brand: "Toby", categorySlug: "pollo", material: "Combo", contents: "1/4 de pollo a la broaster (económico 26 Bs)", details: "Sólo la hamburguesa: Bs 26. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/pollo-broaster-cuarto.webp", "/imgs/menu/escena-pollo-broaster-cuarto.webp"], featured: false },
  { name: "Pollo Brasa", slug: "pollo-brasa-cuarto", description: "1/4 de pollo a la brasa con papas y arroz", price: 36, brand: "Toby", categorySlug: "pollo", material: "Combo", contents: "1/4 de pollo a la brasa (económico 26 Bs)", details: "Sólo la hamburguesa: Bs 26. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/pollo-brasa-cuarto.webp", "/imgs/menu/escena-pollo-brasa-cuarto.webp"], featured: false },
  { name: "Pipoca Pollo", slug: "pipoca-pollo", description: "Pipocas de pollo crocantes", price: 35, brand: "Toby", categorySlug: "pollo", material: "Combo", contents: "Pipocas de pollo + papas fritas + gaseosa", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/pipoca-pollo.webp", "/imgs/menu/escena-pipoca-pollo.webp"], featured: false },
  { name: "Pollo Broaster Balde (6 piezas)", slug: "broaster-balde-6", description: "Balde para compartir", price: 130, brand: "Toby", categorySlug: "pollo", material: "Para compartir", contents: "6 piezas de pollo + 2 papas medianas + 1 porción de arroz + Coca-Cola 1 lt", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/broaster-balde-6.webp", "/imgs/menu/escena-broaster-balde-6.webp"], featured: false },
  { name: "Pollo Broaster Balde (10 piezas)", slug: "broaster-balde-10", description: "Balde para compartir", price: 160, brand: "Toby", categorySlug: "pollo", material: "Para compartir", contents: "10 piezas de pollo + 2 papas grandes + 2 porciones de arroz + Coca-Cola 2 lt", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/broaster-balde-10.webp", "/imgs/menu/escena-broaster-balde-10.webp"], featured: false },
  { name: "Combo Toby Nuggets (6 und)", slug: "nuggets-6", description: "Nuggets de pollo con salsa", price: 46, brand: "Toby", categorySlug: "nuggets-alitas", material: "Combo", contents: "6 nuggets + papas fritas + gaseosa (6 unidades solas 30 Bs)", details: "Sólo la hamburguesa: Bs 30. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/nuggets-6.webp", "/imgs/menu/escena-nuggets-6.webp"], featured: false },
  { name: "Combo Toby Nuggets (10 und)", slug: "nuggets-10", description: "Nuggets de pollo con salsa", price: 53, brand: "Toby", categorySlug: "nuggets-alitas", material: "Combo", contents: "10 nuggets + papas fritas + gaseosa (10 unidades solas 38 Bs)", details: "Sólo la hamburguesa: Bs 38. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/nuggets-10.webp", "/imgs/menu/escena-nuggets-10.webp"], featured: false },
  { name: "Wing Wings", slug: "wing-wings", description: "Alitas crocantes en caja Win Wings: crocantes, barbacoa, picantes y dulce", price: 60, brand: "Toby", categorySlug: "nuggets-alitas", material: "Combo", contents: "12 alitas crocantes + papas fritas (6 alitas solas 36 Bs)", details: "Sólo la hamburguesa: Bs 36. Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/wing-wings.webp", "/imgs/menu/escena-wing-wings.webp"], featured: false },
  { name: "Cono", slug: "cono", description: "Sabores: chocolate, mixto, vainilla", price: 8, brand: "Toby", categorySlug: "postres", material: "Postre", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/cono.webp", "/imgs/menu/escena-cono.webp"], featured: false },
  { name: "Fruggy", slug: "fruggy", description: "Sabores: Oreo, Rocklets", price: 18, brand: "Toby", categorySlug: "postres", material: "Postre", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/fruggy.webp", "/imgs/menu/escena-fruggy.webp"], featured: false },
  { name: "Milk Shake", slug: "milk-shake", description: "Sabores: café, frutilla, Oreo, chocolate", price: 26, brand: "Toby", categorySlug: "postres", material: "Postre", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/milk-shake.webp", "/imgs/menu/escena-milk-shake.webp"], featured: false },
  { name: "Sundae", slug: "sundae", description: "Sabores: chocolate, frutilla, dulce de leche", price: 16, brand: "Toby", categorySlug: "postres", material: "Postre", details: "Precio en local · el delivery se coordina con la sucursal.", stock: 40, images: ["/imgs/menu/sundae.webp", "/imgs/menu/escena-sundae.webp"], featured: false },
];

async function main() {
  console.log("🌱 Seeding Toby ¡Mi Hamburguesa! database...");

  // Categories
  const categoryIdBySlug = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, image: c.image },
      create: c,
    });
    categoryIdBySlug.set(c.slug, cat.id);
  }
  console.log(`  ✔ ${categories.length} categories`);

  // Locations publicly named for Toby. Only Cristóbal de Mendoza is confirmed by
  // the brand's own posts; the mall locations come from third-party mentions, so
  // addresses, hours and coordinates are left for Admin → Sucursales until the
  // chain sends its official list. The map skips branches without coordinates.
  const branches = [
    { name: "Cristóbal de Mendoza · 2do anillo", slug: "cristobal-de-mendoza", code: "TB01", address: "Av. Cristóbal de Mendoza, 2do anillo", city: "Santa Cruz", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toby+Av+Crist%C3%B3bal+de+Mendoza+2do+anillo+Santa+Cruz", latitude: null, longitude: null, image: null, hours: "Atención de trasnoche · delivery AutoToby", sortOrder: 1 },
    { name: "Cine Center", slug: "cine-center", code: "TB02", address: "Cine Center, Santa Cruz", city: "Santa Cruz", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toby+Cine+Center+Santa+Cruz", latitude: null, longitude: null, image: null, sortOrder: 2 },
    { name: "Ventura Mall", slug: "ventura-mall", code: "TB03", address: "Av. 4to Anillo, Ventura Mall", city: "Santa Cruz", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toby+Ventura+Mall+Santa+Cruz", latitude: null, longitude: null, image: null, sortOrder: 3 },
    { name: "MegaCenter", slug: "megacenter", code: "TB04", address: "Av. El Trompillo, 2do anillo, MegaCenter", city: "Santa Cruz", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toby+MegaCenter+Santa+Cruz", latitude: null, longitude: null, image: null, sortOrder: 4 },
    { name: "Cielo Mall", slug: "cielo-mall", code: "TB05", address: "Cielo Mall, El Alto", city: "El Alto", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toby+Cielo+Mall+El+Alto", latitude: null, longitude: null, image: null, sortOrder: 5 },
  ];
  // The first deploy created a single placeholder branch; rename it in place so
  // its per-branch stock rows carry over to the first real location.
  await prisma.branch.updateMany({ where: { slug: "principal" }, data: branches[0] });
  const branchIds: string[] = [];
  for (const b of branches) {
    const row = await prisma.branch.upsert({
      where: { slug: b.slug },
      update: {}, // never overwrite details the store already edited
      create: b,
      select: { id: true, latitude: true },
    });
    // Branches seeded before coordinates existed get them once, without
    // touching anything the store may have edited afterwards.
    if (row.latitude == null && b.latitude != null) {
      await prisma.branch.update({
        where: { id: row.id },
        data: { address: b.address, latitude: b.latitude, longitude: b.longitude },
      });
    }
    branchIds.push(row.id);
  }

  // Products
  for (const p of products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) continue;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: new Prisma.Decimal(p.price),
        compareAtPrice: p.compareAtPrice ? new Prisma.Decimal(p.compareAtPrice) : null,
        material: p.material,
        brand: p.brand,
        categoryId,
        contents: p.contents,
        details: p.details,
        images: p.images,
        featured: p.featured ?? false,
        sku: p.sku,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: new Prisma.Decimal(p.price),
        compareAtPrice: p.compareAtPrice ? new Prisma.Decimal(p.compareAtPrice) : null,
        material: p.material,
        brand: p.brand,
        categoryId,
        contents: p.contents,
        details: p.details,
        images: p.images,
        featured: p.featured ?? false,
        sku: p.sku,
      },
      select: { id: true },
    });
    for (const branchId of branchIds) {
      await prisma.branchStock.upsert({
        where: { branchId_productId: { branchId, productId: product.id } },
        update: {}, // never overwrite stock that the store already manages
        create: { branchId, productId: product.id, stock: p.stock },
      });
    }
  }
  console.log(`  ✔ ${products.length} products`);
  console.log(`  ✔ ${branches.length} branch(es) with stock`);

  // Seed settings. Toby publishes no central phone, WhatsApp or email that we
  // could verify, so those channels are left blank — the site hides an empty
  // channel instead of showing a placeholder number.
  const settings = {
    contact: {
      email: "",
      phone: "",
      whatsapp: "",
      city: "Santa Cruz, Bolivia",
      hours: "Lunes a domingo · trasnoche en Cristóbal de Mendoza",
    },
    social: {
      instagram: "https://www.instagram.com/tobymihamburguesa/",
      facebook: "https://www.facebook.com/HamburguesasToby/",
      tiktok: "https://www.tiktok.com/@tobybolivia",
    },
    shipping: {
      flatFee: 15.00,
      freeThreshold: 0.00,
      deliveryTime: "lo antes posible, según preparación y distancia",
    },
    announcements: [
      "Desde 1981, la hamburguesa de Santa Cruz",
      "Delivery con AutoToby y PedidosYa",
      "Combos con papas fritas y gaseosa",
      "Retiro en sucursal · Pago contra entrega",
    ],
    inventory: { lowStockThreshold: 5 },
    notifications: { orderEmail: "" },
  };

  await prisma.setting.upsert({
    where: { key: "store" },
    update: { value: settings },
    create: { key: "store", value: settings },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
