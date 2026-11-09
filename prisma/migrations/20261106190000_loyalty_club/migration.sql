-- Club Toby: sellos por producto, puntos por gasto y una tienda de regalos.
-- El ledger es append-only: un saldo es la suma de sus filas.

-- CreateEnum
CREATE TYPE "LoyaltyKind" AS ENUM ('STAMP', 'POINT', 'REDEEM_STAMP', 'REDEEM_PRIZE', 'REFUND', 'ADJUST');
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'READY', 'COLLECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Reward" (
    "slug" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "rewardName" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "branchId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "LoyaltyKind" NOT NULL,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "orderId" TEXT,
    "rewardId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reward_slug_key" ON "Reward"("slug");
CREATE UNIQUE INDEX "Redemption_code_key" ON "Redemption"("code");
CREATE INDEX "Redemption_status_createdAt_idx" ON "Redemption"("status", "createdAt");
CREATE INDEX "Redemption_customerId_idx" ON "Redemption"("customerId");
CREATE INDEX "Reward_active_order_idx" ON "Reward"("active", "order");
CREATE INDEX "LoyaltyEntry_customerId_kind_idx" ON "LoyaltyEntry"("customerId", "kind");
CREATE INDEX "LoyaltyEntry_customerId_productId_idx" ON "LoyaltyEntry"("customerId", "productId");
CREATE INDEX "LoyaltyEntry_orderId_idx" ON "LoyaltyEntry"("orderId");

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
