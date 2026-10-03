import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Headphones,
  HelpCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Chính sách Đổi trả & Hoàn tiền | Mầm Nhỏ",
  description:
    "Chính sách đổi trả hàng trong 14 ngày, đổi tận nhà tiện lợi, cam kết chất lượng và bảo vệ quyền lợi tối đa cho khách hàng của Mầm Nhỏ.",
};

const policyHighlights = [
  {
    icon: Calendar,
    title: "14 Ngày đổi hàng linh hoạt",
    description:
      "Ba mẹ có trọn vẹn 14 ngày kể từ ngày nhận hàng để thử trang phục cho bé và quyết định đổi size hoặc đổi mẫu nếu chưa ưng ý.",
    color: "bg-[#eaf4eb] text-[#426a3c]",
  },
  {
    icon: Truck,
    title: "Đổi hàng 2 chiều tận nơi",
    description:
      "Mẹ không cần đem hàng ra bưu điện. Shipper sẽ mang sản phẩm mới đến tận nhà giao cho mẹ và thu hồi lại sản phẩm cũ cùng lúc.",
    color: "bg-[#e5effb] text-[#2c5b96]",
  },
  {
    icon: ShieldCheck,
    title: "Miễn phí 100% khi có lỗi",
    description:
      "Nếu sản phẩm có lỗi đường chỉ, sai màu, sai kích cỡ so với đơn đặt hàng, Mầm Nhỏ chịu 100% mọi chi phí vận chuyển phát sinh.",
    color: "bg-[#fbeeed] text-[#b44339]",
  },
];

const returnSteps = [
  {
    step: "01",
    title: "Liên hệ Mầm Nhỏ",
    description:
      "Gọi hotline 1900 6868 hoặc nhắn tin trực tiếp qua trang Liên hệ / Zalo OA với mã đơn hàng hoặc số điện thoại của mẹ.",
  },
  {
    step: "02",
    title: "Xác nhận & Giữ hàng",
    description:
      "Chuyên viên chăm sóc khách hàng tư vấn lại kích cỡ chuẩn xác và lập tức tạo đơn hàng đổi mới giữ hàng cho bé.",
  },
  {
    step: "03",
    title: "Giao nhận 2 chiều",
    description:
      "Đơn vị vận chuyển mang kiện hàng mới tới tận nhà, đồng thời nhận lại sản phẩm cần đổi từ tay mẹ.",
  },
  {
    step: "04",
    title: "Hoàn tất đơn đổi",
    description:
      "Bé yêu có ngay bộ đồ vừa vặn, êm mềm để diện vui chơi mỗi ngày mà ba mẹ không tốn nhiều công sức.",
  },
];

const faqs = [
  {
    question: "Sản phẩm mua trong đợt khuyến mãi (Sale/Giảm giá) có được đổi không?",
    answer:
      "Mầm Nhỏ vẫn hỗ trợ đổi size cho các sản phẩm mua trong chương trình khuyến mãi nếu kho còn sẵn kích cỡ thay thế. Trường hợp hết size, ba mẹ có thể đổi sang sản phẩm khác có giá trị tương đương hoặc cao hơn.",
  },
  {
    question: "Phí vận chuyển khi đổi hàng do nhu cầu cá nhân được tính như thế nào?",
    answer:
      "Trường hợp đổi size hoặc đổi mẫu theo sở thích, Mầm Nhỏ hỗ trợ một phần cước phí vận chuyển, ba mẹ chỉ cần thanh toán mức phí đồng giá ưu đãi 20.000đ cho cả quy trình giao - nhận hàng 2 chiều tận nhà.",
  },
  {
    question: "Mầm Nhỏ có chính sách hoàn tiền không?",
    answer:
      "Có. Nếu sản phẩm bị lỗi từ nhà sản xuất mà kho không còn sản phẩm thay thế, hoặc ba mẹ chưa chọn được mẫu ưng ý, Mầm Nhỏ sẽ hoàn tiền 100% vào tài khoản ngân hàng của ba mẹ trong vòng 24 - 48 giờ làm việc sau khi nhận lại hàng.",
  },
  {
    question: "Bao lâu thì bé nhận được sản phẩm đổi mới?",
    answer:
      "Khu vực nội thành Hà Nội & TP. Hồ Chí Minh: Khoảng 1 - 2 ngày làm việc. Các tỉnh thành khác: Khoảng 2 - 4 ngày làm việc tùy thuộc vào tuyến vận chuyển của đối tác giao hàng.",
  },
];

export default function ReturnPolicyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">Chính sách đổi trả</span>
      </nav>

      {/* Header */}
      <div className="max-w-3xl">
        <Badge className="mb-3 bg-brand-soft text-brand-strong">Quyền lợi khách hàng</Badge>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Chính sách Đổi trả & Bảo hành An tâm
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Để bé yêu luôn có những bộ trang phục vừa vặn và êm ái nhất, Mầm Nhỏ áp dụng chính sách
          đổi trả linh hoạt tận nhà trong <strong>14 ngày</strong>, giúp ba mẹ hoàn toàn yên tâm khi
          mua sắm trực tuyến.
        </p>
      </div>

      {/* 3 Core Highlights */}
      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {policyHighlights.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-border/80 bg-surface">
              <CardContent className="p-6">
                <div className={`grid size-12 place-items-center rounded-2xl ${item.color}`}>
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Conditions Section */}
      <section className="mt-14">
        <Card className="border-brand/20 bg-[#faf6f1] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <CheckCircle2 className="size-5 text-brand" /> Điều kiện áp dụng đổi trả
          </h2>
          <p className="mt-2 text-sm text-muted">
            Nhằm đảm bảo vệ sinh và an toàn tuyệt đối cho làn da của các bé sau này, sản phẩm đổi trả
            cần đáp ứng các tiêu chuẩn sau:
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-white p-4">
              <span className="inline-block rounded-lg bg-sage-soft px-2.5 py-1 text-xs font-bold text-sage">
                Đủ điều kiện đổi trả
              </span>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-brand">•</span>
                  <span>Sản phẩm còn nguyên tem mác giá, nhãn dệt thương hiệu Mầm Nhỏ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-brand">•</span>
                  <span>Chưa qua giặt tẩy, không bám mùi nước hoa, mùi sữa hoặc thức ăn.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-brand">•</span>
                  <span>Không bị rách, sờn chỉ do tác động ngoại lực sau khi đã nhận hàng.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-brand">•</span>
                  <span>Có thông tin số điện thoại đặt hàng hoặc mã hóa đơn mua hàng.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/80 bg-white p-4">
              <span className="inline-block rounded-lg bg-[#fae8e6] px-2.5 py-1 text-xs font-bold text-[#b44339]">
                Lưu ý không áp dụng
              </span>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#b44339]">•</span>
                  <span>Quá 14 ngày kể từ ngày đơn vị vận chuyển giao hàng thành công.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#b44339]">•</span>
                  <span>Sản phẩm đồ lót, tất chân đã xé bao bì (vì lý do vệ sinh cho bé).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#b44339]">•</span>
                  <span>Hàng quà tặng kèm theo các chương trình mini-game hoặc tặng miễn phí.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#b44339]">•</span>
                  <span>Sản phẩm đã bị can thiệp cắt gấu, sửa form áo/quần.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* 4-Step Process */}
      <section className="mt-16">
        <div className="text-center">
          <Badge className="mb-2 bg-brand-soft text-brand-strong">Quy trình thuận tiện</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            4 Bước đổi hàng đơn giản tại Mầm Nhỏ
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Mẹ chỉ cần ngồi tại nhà, toàn bộ khâu giao hàng mới và nhận hàng cũ đều có nhân viên vận
            chuyển lo chu toàn.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {returnSteps.map((step) => (
            <Card key={step.step} className="border-border/80 bg-surface">
              <CardContent className="p-6">
                <span className="text-3xl font-black text-brand/30">{step.step}</span>
                <h3 className="mt-2 text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Transparent Fee Table */}
      <section className="mt-16">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Biểu phí vận chuyển đổi trả minh bạch
        </h2>
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[#f7f2ec] text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-4">Trường hợp đổi hàng</th>
                  <th className="px-5 py-4">Phí vận chuyển 2 chiều</th>
                  <th className="px-5 py-4">Thời gian xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-surface-soft/60">
                  <td className="px-5 py-4 font-semibold text-foreground">
                    Lỗi từ nhà sản xuất, lỗi đường may hoặc giao sai mẫu/size
                  </td>
                  <td className="px-5 py-4 font-bold text-[#426a3c]">Miễn phí 100%</td>
                  <td className="px-5 py-4 text-xs text-muted">Giao đổi ngay trong 24h</td>
                </tr>
                <tr className="hover:bg-surface-soft/60">
                  <td className="px-5 py-4 font-semibold text-foreground">
                    Khách hàng muốn đổi kích cỡ (size) hoặc đổi sang mẫu khác
                  </td>
                  <td className="px-5 py-4 font-semibold text-brand">
                    Đồng giá 20.000đ (Shop trợ giá)
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">Xử lý trong 1 - 2 ngày</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* FAQ Section */}
      <section className="mt-16">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-6 text-brand" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Các câu hỏi thường gặp về đổi trả
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-border/80 bg-surface">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-foreground sm:text-base">{faq.question}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Support Box */}
      <section className="mt-14 flex flex-col items-center justify-between gap-6 rounded-[2rem] bg-gradient-to-r from-brand via-brand-strong to-[#7a3224] p-6 text-white sm:flex-row sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-white backdrop-blur">
            <Headphones className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Cần hỗ trợ đổi hàng ngay bây giờ?</h3>
            <p className="text-xs text-white/90 sm:text-sm">
              Hotline CSKH miễn phí: <strong>1900 6868</strong> (8h00 - 21h00 mỗi ngày).
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <ButtonLink
            href="/contact"
            variant="inverse"
            size="sm"
          >
            Gửi yêu cầu đổi hàng
          </ButtonLink>
          <ButtonLink
            href="/products"
            variant="inverse-outline"
            size="sm"
          >
            Mua sắm tiếp
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
