-- Multi-branch: shared catalog, stock per branch, branch-scoped orders/staff.

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "hours" TEXT,
    "image" TEXT,
    "mapsUrl" TEXT,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "flatFee" DECIMAL(10,2),
    "freeThreshold" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchStock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_slug_key" ON "Branch"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Branch_active_sortOrder_idx" ON "Branch"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BranchStock_branchId_productId_key" ON "BranchStock"("branchId", "productId");

-- CreateIndex
CREATE INDEX "BranchStock_productId_idx" ON "BranchStock"("productId");

-- AddForeignKey
ALTER TABLE "BranchStock" ADD CONSTRAINT "BranchStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchStock" ADD CONSTRAINT "BranchStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order: branch + fulfillment; pickup needs no address.
ALTER TABLE "Order"
    ADD COLUMN "fulfillment" "FulfillmentType" NOT NULL DEFAULT 'DELIVERY',
    ADD COLUMN "branchId" TEXT,
    ALTER COLUMN "address" DROP NOT NULL,
    ALTER COLUMN "city" DROP NOT NULL;

-- Existing orders (if any) move to a temporary branch so the column can be
-- required. Fresh databases have no orders and skip this entirely.
INSERT INTO "Branch" (
    "id", "name", "slug", "code", "address", "city",
    "deliveryEnabled", "pickupEnabled", "active", "sortOrder", "createdAt", "updatedAt"
)
SELECT
    'santamaria-principal', 'Sucursal principal', 'principal', 'SM00', 'Por definir', 'Por definir',
    true, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Order");

UPDATE "Order" SET "branchId" = 'santamaria-principal' WHERE "branchId" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "branchId" SET NOT NULL;

-- Move the legacy chain-wide stock into that temporary branch.
INSERT INTO "BranchStock" ("id", "branchId", "productId", "stock", "active", "updatedAt")
SELECT 'bs-' || p."id", 'santamaria-principal', p."id", p."stock", true, CURRENT_TIMESTAMP
FROM "Product" p
WHERE EXISTS (SELECT 1 FROM "Branch" b WHERE b."id" = 'santamaria-principal')
ON CONFLICT ("branchId", "productId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Order_branchId_createdAt_idx" ON "Order"("branchId", "createdAt");

-- Staff are bound to a branch; admins stay global (NULL).
ALTER TABLE "User" ADD COLUMN "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- Stock now lives per branch.
ALTER TABLE "Product" DROP COLUMN "stock";
