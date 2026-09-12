import type { Metadata } from "next";

import { ProductsCatalog } from "@/features/catalog/components/products-catalog";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description: "Khám phá các thiết kế thời trang trẻ em mới nhất từ Mầm Nhỏ.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  return <ProductsCatalog initialCategory={params.category ?? ""} />;
}
