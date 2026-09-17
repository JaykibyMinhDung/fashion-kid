import { Star } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReviewsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
          Đánh giá sản phẩm
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
          Nhận xét từ khách hàng
        </h1>
      </div>

      <EmptyState
        title="Tính năng đang phát triển"
        description="Hệ thống đánh giá sản phẩm đang được xây dựng. Sớm thôi bạn sẽ có thể đọc và chia sẻ nhận xét thực tế về các sản phẩm thời trang bé yêu."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/products" size="md">
              <Star className="size-4" />
              Xem sản phẩm
            </ButtonLink>
          </div>
        }
      />
    </main>
  );
}
