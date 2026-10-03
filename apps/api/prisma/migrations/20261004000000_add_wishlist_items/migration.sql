-- Bổ sung migration còn thiếu cho model WishlistItem (schema.prisma có từ commit 3741205
-- nhưng chưa có migration, nên CSDL tạo bằng `prisma migrate deploy` không có bảng này).
-- Viết dạng IF NOT EXISTS để chạy an toàn cả trên CSDL đã lỡ tạo bảng bằng `prisma db push`.

-- CreateTable
CREATE TABLE IF NOT EXISTS "wishlist_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wishlist_items_user_id_created_at_idx" ON "wishlist_items"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wishlist_items_product_id_idx" ON "wishlist_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_id_product_id_key" ON "wishlist_items"("user_id", "product_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_user_id_fkey') THEN
        ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_id_fkey') THEN
        ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
