-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PEN',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "operationDate" TIMESTAMP(3),
ADD COLUMN     "operationType" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- CreateIndex
CREATE INDEX "Transaction_currency_idx" ON "Transaction"("currency");
