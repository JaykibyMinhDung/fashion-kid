-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('ISSUED', 'VOID');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "net_amount" BIGINT,
ADD COLUMN     "tax_amount" BIGINT,
ADD COLUMN     "tax_rate_bps" INTEGER;

-- CreateTable
CREATE TABLE "invoice_counters" (
    "year_month" VARCHAR(6) NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("year_month")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "invoice_number" VARCHAR(30) NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "voided_at" TIMESTAMPTZ(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "net_amount" BIGINT NOT NULL,
    "tax_rate_bps" INTEGER NOT NULL,
    "tax_amount" BIGINT NOT NULL,
    "gross_amount" BIGINT NOT NULL,
    "seller_snapshot" JSONB NOT NULL,
    "buyer_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "invoices_status_issued_at_idx" ON "invoices"("status", "issued_at");

-- CreateIndex
CREATE INDEX "orders_status_completed_at_idx" ON "orders"("status", "completed_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
