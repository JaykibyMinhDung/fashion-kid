import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/shared/safe-image";
import {
  getProductBySlug,
  type CatalogProductDetail,
} from "@/features/catalog/api/catalog-client";
import { ApiClientError } from "@/lib/api/api-client";
import { ProductPurchasePanel } from "@/features/cart/components/product-purchase-panel";
import { ProductReviews } from "@/features/reviews/components/product-reviews";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadProduct(slug: string): Promise<CatalogProductDetail | null> {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) return { title: "Không tìm thấy sản phẩm" };

  return {
    title: product.name,
    description: `${product.name} · ${product.category.name} · ${formatCurrency(product.minPrice)}`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  const image = product.primaryImage;
  const hasPriceRange = product.minPrice !== product.maxPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-surface-soft">
          <SafeImage
            src={image?.url ?? "/images/kids-fashion-hero.png"}
            alt={image?.altText ?? product.name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          {image?.isPrimary ? (
            <Badge className="absolute left-5 top-5 bg-white/90">
              Mới từ Catalog
            </Badge>
          ) : null}
        </div>

        <section className="flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">
            {product.category.name} · Product Variant
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            {product.name}
          </h1>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-2xl font-black text-brand-strong">
              {hasPriceRange
                ? `${formatCurrency(product.minPrice)} – ${formatCurrency(product.maxPrice)}`
                : formatCurrency(product.minPrice)}
            </span>
          </div>
          <p className="mt-6 leading-7 text-muted">
            {product.description ??
              "Thiết kế mềm nhẹ, dễ vận động và có nhiều biến thể màu sắc, kích thước."}{" "}
            Dữ liệu tồn kho được theo dõi ở cấp variant.
          </p>

          <ProductPurchasePanel variants={product.variants} />
          <p className="mt-4 flex items-center gap-2 text-sm text-sage">
            <Check className="size-4" /> {product.variants.length} biến thể đang
            bán
          </p>
        </section>
      </div>

      <div className="mt-14 border-t border-border pt-10">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
