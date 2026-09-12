-- Align the pre-freeze foundation with the Day 15/16 source of truth.
-- This migration is forward-only; previously applied migrations remain immutable.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "addresses"
    WHERE "ward_code" IS NULL OR "province_code" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require canonical address codes while null address rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "orders"
    WHERE "shipping_ward_code" IS NULL OR "shipping_province_code" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require order snapshot codes while null order rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "order_items"
    WHERE "variant_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require order item variant trace while null rows exist';
  END IF;
END
$migration$;

ALTER TABLE "addresses"
  ALTER COLUMN "ward_code" SET NOT NULL,
  ALTER COLUMN "province_code" SET NOT NULL;

ALTER TABLE "orders" RENAME COLUMN "customer_id" TO "user_id";
ALTER TABLE "orders" RENAME COLUMN "subtotal" TO "items_subtotal";
ALTER TABLE "orders" RENAME COLUMN "shipping_name" TO "receiver_name";
ALTER TABLE "orders" RENAME COLUMN "shipping_phone" TO "receiver_phone";

ALTER TABLE "orders"
  ADD COLUMN "payment_method" "payment_method" NOT NULL DEFAULT 'COD',
  ADD COLUMN "shipping_tracking_code" VARCHAR(150),
  ADD COLUMN "shipping_provider_status" VARCHAR(100),
  ADD COLUMN "shipping_last_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(3),
  ADD COLUMN "packing_at" TIMESTAMPTZ(3),
  ADD COLUMN "shipping_at" TIMESTAMPTZ(3),
  ADD COLUMN "delivered_at" TIMESTAMPTZ(3),
  ALTER COLUMN "shipping_ward_code" SET NOT NULL,
  ALTER COLUMN "shipping_province_code" SET NOT NULL;

ALTER TABLE "orders"
  RENAME CONSTRAINT "orders_customer_id_fkey" TO "orders_user_id_fkey";

DROP INDEX "orders_customer_id_created_at_idx";
CREATE INDEX "orders_user_id_created_at_idx"
  ON "orders"("user_id", "created_at");
CREATE INDEX "orders_completed_at_idx" ON "orders"("completed_at");
CREATE INDEX "orders_shipping_tracking_code_idx"
  ON "orders"("shipping_tracking_code");
CREATE UNIQUE INDEX "orders_shipping_provider_shipping_tracking_code_key"
  ON "orders"("shipping_provider", "shipping_tracking_code");

ALTER TABLE "order_items"
  DROP CONSTRAINT "order_items_variant_id_fkey";
ALTER TABLE "order_items"
  ALTER COLUMN "variant_id" SET NOT NULL;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "order_counters" (
  "order_date" DATE NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "order_counters_pkey" PRIMARY KEY ("order_date"),
  CONSTRAINT "order_counters_last_value_check" CHECK ("last_value" >= 0)
);

DROP SEQUENCE IF EXISTS "order_number_seq";

ALTER TABLE "payments"
  RENAME COLUMN "provider_payment_id" TO "provider_transaction_id";
DROP INDEX "payments_provider_provider_payment_id_idx";
CREATE UNIQUE INDEX "payments_provider_transaction_id_key"
  ON "payments"("provider_transaction_id");
CREATE INDEX "payments_provider_idx" ON "payments"("provider");

ALTER TABLE "payment_transactions"
  RENAME COLUMN "provider_reference" TO "attempt_ref";
DROP INDEX "payment_transactions_provider_transaction_id_idx";
CREATE UNIQUE INDEX "payment_transactions_attempt_ref_key"
  ON "payment_transactions"("attempt_ref");
CREATE UNIQUE INDEX "payment_transactions_provider_transaction_id_key"
  ON "payment_transactions"("provider_transaction_id");
