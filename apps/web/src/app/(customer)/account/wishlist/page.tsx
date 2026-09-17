import { Heart } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AccountWishlistPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
          Tài khoản của bạn
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
          Sản phẩm yêu thích
        </h1>
      </div>

      <EmptyState
        title="Tính năng đang phát triển"
        description="Chúng tôi đang xây dựng tính năng lưu sản phẩm yêu thích vào tài khoản cá nhân của bạn. Sớm thôi bạn sẽ có thể quản lý danh sách yêu thích từ đây."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/products" size="md">
              <Heart className="size-4" />
              Khám phá sản phẩm
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
