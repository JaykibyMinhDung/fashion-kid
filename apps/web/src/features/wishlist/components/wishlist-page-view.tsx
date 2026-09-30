"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/session/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getWishlist, removeFromWishlist } from "../api/wishlist-client";
import type { WishlistItem } from "../contracts";

function formatVnd(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0 ₫";
  return num.toLocaleString("vi-VN") + " ₫";
}

function formatPriceRange(minPrice: string, maxPrice: string): string {
  if (minPrice === maxPrice) {
    return formatVnd(minPrice);
  }
  return `${formatVnd(minPrice)} - ${formatVnd(maxPrice)}`;
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-square animate-pulse bg-surface-soft" />
          <CardContent className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-soft" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-soft" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WishlistEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-soft">
        <Heart className="size-8 text-muted" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        Chưa có sản phẩm yêu thích
      </h3>
      <p className="max-w-sm text-sm text-muted">
        Hãy khám phá và thêm các sản phẩm bạn yêu thích để xem lại sau.
      </p>
    </div>
  );
}

interface WishlistCardProps {
  item: WishlistItem;
  onRemove: (productId: string) => void;
  removing: boolean;
}

function WishlistCard({ item, onRemove, removing }: WishlistCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/products/${item.productSlug}`} className="block">
        <div className="relative aspect-square bg-surface-soft">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.productName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Heart className="size-10 text-muted" />
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link
          href={`/products/${item.productSlug}`}
          className="mb-2 line-clamp-2 block text-sm font-medium text-foreground hover:text-brand-strong"
        >
          {item.productName}
        </Link>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-strong">
            {formatPriceRange(item.minPrice, item.maxPrice)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.productId)}
            disabled={removing}
            aria-label={`Xóa ${item.productName} khỏi danh sách yêu thích`}
            className="size-8 text-muted hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WishlistPageView() {
  const { authorizedRequest, user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await getWishlist(authorizedRequest);
      setItems(data.items);
    } catch {
      // Error state could be added here
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    fetchWishlist();
  }, [user, fetchWishlist]);

  const handleRemove = useCallback(
    async (productId: string) => {
      setRemovingId(productId);
      try {
        await removeFromWishlist(authorizedRequest, productId);
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      } catch {
        // Could show a toast on failure
      } finally {
        setRemovingId(null);
      }
    },
    [authorizedRequest],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        eyebrow="Tài khoản · Yêu thích"
        title="Sản phẩm yêu thích"
      />

      <div className="mt-8">
        {loading ? (
          <WishlistSkeleton />
        ) : items.length === 0 ? (
          <WishlistEmpty />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <WishlistCard
                key={item.productId}
                item={item}
                onRemove={handleRemove}
                removing={removingId === item.productId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
