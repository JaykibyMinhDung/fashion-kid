import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CatalogProductCard } from "@/features/catalog/api/catalog-client";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/catalog";

type ProductCardProps =
  | { product: Product }
  | { product: CatalogProductCard };

function isCatalogProduct(p: Product | CatalogProductCard): p is CatalogProductCard {
  return "minPrice" in p;
}

export function ProductCard({ product }: ProductCardProps) {
  if (isCatalogProduct(product)) {
    const imageUrl = product.primaryImage?.url ?? "/images/placeholder.png";
    const imageAlt = product.primaryImage?.altText ?? product.name;

    return (
      <article className="group min-w-0">
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-surface-soft">
          <Link
            href={`/products/${product.slug}`}
            aria-label={`Xem ${product.name}`}
            className="relative block h-full"
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </Link>
          <button
            type="button"
            aria-label={`Thêm ${product.name} vào yêu thích`}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:text-brand-strong"
          >
            <Heart className="size-5" />
          </button>
        </div>
        <div className="px-1 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">
            {product.category.name}
          </p>
          <Link
            href={`/products/${product.slug}`}
            className="mt-1 block text-base font-bold tracking-[-0.02em] transition hover:text-brand-strong"
          >
            {product.name}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-bold text-brand-strong">
              {formatCurrency(product.minPrice)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Legacy mock Product type
  return (
    <article className="group min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-surface-soft">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`Xem ${product.name}`}
          className="relative block h-full"
        >
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        {product.badge ? (
          <Badge className="absolute left-4 top-4 bg-white/90 backdrop-blur">
            {product.badge}
          </Badge>
        ) : null}
        <button
          type="button"
          aria-label={`Thêm ${product.name} vào yêu thích`}
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:text-brand-strong"
        >
          <Heart className="size-5" />
        </button>
      </div>
      <div className="px-1 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">
          {product.category}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1 block text-base font-bold tracking-[-0.02em] transition hover:text-brand-strong"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-bold text-brand-strong">{formatCurrency(product.price)}</span>
          {product.compareAtPrice ? (
            <span className="text-sm text-muted line-through">
              {formatCurrency(product.compareAtPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
