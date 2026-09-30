"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/session/auth-provider";
import { addToWishlist, checkWishlist, removeFromWishlist } from "../api/wishlist-client";

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { authorizedRequest, user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function check() {
      try {
        const result = await checkWishlist(authorizedRequest, productId);
        if (!cancelled) {
          setInWishlist(result.inWishlist);
        }
      } catch {
        // Silently fail — button stays in default state
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [user, productId, authorizedRequest]);

  const handleToggle = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setAnimate(true);

    try {
      if (inWishlist) {
        await removeFromWishlist(authorizedRequest, productId);
        setInWishlist(false);
      } else {
        await addToWishlist(authorizedRequest, productId);
        setInWishlist(true);
      }
    } catch {
      // Revert optimistic state would go here if we had one
    } finally {
      setLoading(false);
      setTimeout(() => setAnimate(false), 300);
    }
  }, [inWishlist, loading, authorizedRequest, productId]);

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={inWishlist ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "size-9 bg-white/80 backdrop-blur-sm shadow-sm",
        "border border-border transition-all duration-200",
        "hover:bg-white hover:shadow-md",
        "disabled:pointer-events-none disabled:opacity-50",
        animate && "scale-125",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors duration-200",
          inWishlist
            ? "fill-red-500 text-red-500"
            : "fill-none text-muted-foreground",
        )}
      />
    </button>
  );
}
