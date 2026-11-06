-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentRef" TEXT;

-- CreateIndex
CREATE INDEX "Order_paymentRef_idx" ON "Order"("paymentRef");
