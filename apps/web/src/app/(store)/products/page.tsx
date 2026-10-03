import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsCatalog } from "@/features/catalog/components/products-catalog";
import ProductsLoading from "./loading";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description: "Khám phá các thiết kế thời trang trẻ em mới nhất từ Mầm Nhỏ.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsCatalog />
    </Suspense>
  );
}
