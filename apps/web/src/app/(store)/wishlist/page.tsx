import { Heart } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function WishlistPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
          Danh sách yêu thích
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
          Sản phẩm đã lưu
        </h1>
      </div>

      <EmptyState
        title="Tính năng đang phát triển"
        description="Chúng tôi đang xây dựng tính năng danh sách yêu thích để bạn lưu lại những sản phẩm ưa thích và mua sắm dễ dàng hơn. Hãy quay lại sớm nhé!"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/products" size="md">
              <Heart className="size-4" />
              Khám phá sản phẩm
            </ButtonLink>
          </div>
        }
      />
    </main>
  );
}
