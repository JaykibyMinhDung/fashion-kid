import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Heart,
  Leaf,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Về Mầm Nhỏ | Thương hiệu thời trang trẻ em an lành",
  description:
    "Câu chuyện của Mầm Nhỏ - Thương hiệu thời trang trẻ em khởi nguồn từ tình yêu thương, với chất liệu tự nhiên, mềm mại và an toàn cho bé yêu.",
};

const coreValues = [
  {
    icon: Leaf,
    title: "100% Sợi tự nhiên",
    description:
      "Tuyển chọn kỹ lưỡng chất vải Organic Cotton, sợi tre (Bamboo) và Linen tự nhiên thoáng khí, thấm hút mồ hôi vượt trội và thân thiện với làn da non nớt của bé.",
    color: "bg-[#e8f3e2] text-[#4d7039]",
  },
  {
    icon: ShieldCheck,
    title: "An toàn tuyệt đối",
    description:
      "Tất cả sản phẩm đều tuân thủ quy trình kiểm định nghiêm ngặt: không chứa Formaldehyde, không thuốc nhuộm độc hại, cúc bấm kim loại bọc viền chống trầy xước.",
    color: "bg-[#e2edf8] text-[#336399]",
  },
  {
    icon: Heart,
    title: "Thiết kế nâng niu vận động",
    description:
      "Đường may bọc viền phẳng mịn không gây cộm ngứa, form dáng rộng rãi cho bé thoải mái lẫy, bò, tập đi và tự do khám phá thế giới xung quanh.",
    color: "bg-[#fceeed] text-[#b84d43]",
  },
  {
    icon: Sparkles,
    title: "Bền vững & Tận tâm",
    description:
      "Sử dụng bao bì giấy tái chế, quy trình sản xuất tiết kiệm nước và chính sách hỗ trợ đổi hàng tận nhà 14 ngày để ba mẹ luôn an tâm tuyệt đối.",
    color: "bg-[#f8ede3] text-[#9c6332]",
  },
];

const stats = [
  { value: "50.000+", label: "Bé yêu đồng hành" },
  { value: "99.2%", label: "Ba mẹ hài lòng & tin dùng" },
  { value: "100+", label: "Mẫu mã thiết kế độc quyền" },
  { value: "14 ngày", label: "Đổi size tận nơi miễn phí" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">Về Mầm Nhỏ</span>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f8f3ed] via-[#f4ebe1] to-[#e8dfd3] p-8 sm:p-12 lg:p-16">
        <div className="max-w-3xl">
          <Badge className="mb-4 bg-brand-soft text-brand-strong">Câu chuyện thương hiệu</Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Nâng niu từng bước khôn lớn của bé
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Khởi nguồn từ trăn trở của những người làm cha mẹ khi tìm kiếm những trang phục vừa êm
            mềm, an toàn cho làn da nhạy cảm vừa thẩm mỹ, <strong>Mầm Nhỏ</strong> ra đời với tâm
            nguyện mang đến cho con những gì thuần khiết và tốt đẹp nhất.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/products" size="lg">
              Khám phá bộ sưu tập
            </ButtonLink>
            <ButtonLink href="/size-guide" variant="outline" size="lg">
              Hướng dẫn chọn size
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border-border/80 bg-surface text-center">
            <CardContent className="p-6">
              <p className="text-3xl font-black tracking-tight text-brand sm:text-4xl">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-medium text-muted">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Story & Mission Section */}
      <section className="mt-16 grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Badge className="bg-sage-soft text-sage">Sứ mệnh của chúng tôi</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mỗi sợi vải là một lời thì thầm yêu thương
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Làn da của trẻ nhỏ mỏng hơn da người lớn tới 30% và vô cùng nhạy cảm với các loại sợi
            nhân tạo hay hóa chất dệt nhuộm. Thấu hiểu điều đó, đội ngũ thiết kế của Mầm Nhỏ luôn
            kiên định với triết lý: <strong>an toàn là ưu tiên số một</strong>.
          </p>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Chúng tôi tự hào khi mỗi sản phẩm xuất xưởng đều trải qua quy trình may khép kín, từ
            khâu lựa chọn sợi bông hữu cơ, kiểm duyệt độ mềm mịn, cho đến từng đường vắt sổ giấu
            mép để không bao giờ để lại vết hằn trên cơ thể non nớt của bé.
          </p>
          <ul className="space-y-3 pt-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0 text-brand" />
              <span>Chất liệu vải đạt tiêu chuẩn an toàn cho trẻ sơ sinh & trẻ nhỏ.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0 text-brand" />
              <span>Màu sắc pastel dịu mắt, truyền cảm hứng bình yên và tươi vui.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0 text-brand" />
              <span>Dễ dàng giặt ủi, độ co giãn tự nhiên, giữ form bền bỉ sau nhiều lần giặt.</span>
            </li>
          </ul>
        </div>

        {/* Highlight Card */}
        <Card className="border-brand/20 bg-[#faf6f0] p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand text-white">
              <Users className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Lời nhắn từ Nhà sáng lập</h3>
              <p className="text-xs text-muted">Đội ngũ sáng lập Mầm Nhỏ</p>
            </div>
          </div>
          <blockquote className="mt-6 border-l-4 border-brand pl-4 text-sm italic leading-relaxed text-muted">
            &ldquo;Khi con chào đời, mong ước lớn nhất của chúng tôi là bao bọc con trong những gì dịu
            dàng nhất. Mầm Nhỏ không chỉ bán quần áo, mà cùng ba mẹ gói ghém tình yêu thương vào từng
            khoảnh khắc lớn khôn của bé.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
            <span>Hà Nội, 2026</span>
            <span className="font-semibold text-brand">Đồng hành cùng bé yêu</span>
          </div>
        </Card>
      </section>

      {/* Core Values Section */}
      <section className="mt-20">
        <div className="text-center">
          <Badge className="mb-2 bg-brand-soft text-brand-strong">Giá trị khác biệt</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            4 Tiêu chuẩn vàng tạo nên Mầm Nhỏ
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
            Chúng tôi tỉ mỉ trong từng chi tiết nhỏ nhất để mang đến trải nghiệm trang phục hoàn hảo
            cho bé yêu của bạn.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {coreValues.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className={`grid size-12 place-items-center rounded-2xl ${item.color}`}>
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Box */}
      <section className="mt-20 rounded-[2rem] bg-brand p-8 text-center text-white sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Sẵn sàng chọn cho bé trang phục ưng ý?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">
          Trải nghiệm ngay bộ sưu tập quần áo trẻ em từ Mầm Nhỏ với chính sách đổi trả 14 ngày tiện
          lợi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-brand shadow-sm transition hover:bg-[#faf4ef]"
          >
            Xem tất cả sản phẩm
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/60 bg-transparent px-8 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Liên hệ tư vấn
          </Link>
        </div>
      </section>
    </div>
  );
}
