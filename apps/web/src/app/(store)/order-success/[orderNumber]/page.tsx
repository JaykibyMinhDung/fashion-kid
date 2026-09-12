import { CheckCircle, Clock, ShoppingBag } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-bounce-short">
          <CheckCircle className="h-10 w-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Cảm ơn bạn đã đặt hàng!
        </h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          Đơn hàng của bạn đã được tiếp nhận thành công và đang được chuẩn bị để
          giao đến bé.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2 shadow-xs">
          <span className="text-xs font-semibold text-muted">Mã đơn hàng:</span>
          <span className="font-mono text-sm font-bold text-brand">
            {orderNumber}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {/* Order Details Summary Card */}
        <Card className="rounded-3xl border-border bg-surface p-6 shadow-sm">
          <CardContent className="space-y-6 p-0">
            <h2 className="text-base font-bold text-foreground">
              Thông tin đơn hàng
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-2xl bg-surface-soft p-4 space-y-1">
                <span className="text-xs font-semibold text-muted">
                  Phương thức thanh toán
                </span>
                <p className="font-bold text-foreground">
                  Thanh toán khi nhận hàng (COD)
                </p>
                <p className="text-xs text-muted">
                  Vui lòng chuẩn bị tiền mặt khi nhận hàng
                </p>
              </div>

              <div className="rounded-2xl bg-surface-soft p-4 space-y-1">
                <span className="text-xs font-semibold text-muted">
                  Trạng thái đơn hàng
                </span>
                <p className="font-bold text-amber-600 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Chờ xác nhận
                </p>
                <p className="text-xs text-muted">
                  Bộ phận CSKH sẽ xác nhận đơn trong giờ làm việc
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground">
                Quy trình xử lý đơn hàng
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Xác nhận đơn
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Kiểm tra thông tin người nhận
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Đóng gói
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Kiểm tra chất lượng và xuất kho
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Giao hàng COD
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Nhận hàng và thanh toán tiền mặt
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
          <ButtonLink href="/products" variant="primary" size="lg">
            <ShoppingBag className="h-5 w-5 mr-1.5" />
            Tiếp tục mua sắm
          </ButtonLink>
          <ButtonLink href="/cart" variant="outline" size="lg">
            Xem giỏ hàng
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
