import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/features/catalog/components/product-card";
import { featuredProducts } from "@/features/catalog/data/mock-products";

const categories = [
  {
    label: "Bé gái",
    detail: "Váy và những gam màu dịu",
    href: "/products?category=be-gai",
    className: "bg-[#f6ddd6]",
    accent: "text-[#a84938]",
  },
  {
    label: "Bé trai",
    detail: "Thoải mái cho ngày năng động",
    href: "/products?category=be-trai",
    className: "bg-sage-soft",
    accent: "text-[#556548]",
  },
  {
    label: "Sơ sinh",
    detail: "Êm mềm cho làn da đầu đời",
    href: "/products?category=so-sinh",
    className: "bg-[#f8e8cf]",
    accent: "text-[#9a6734]",
  },
];

const commitments = [
  { icon: Leaf, title: "Chất liệu thân thiện", detail: "Cotton và linen mềm thoáng" },
  { icon: ShieldCheck, title: "Đổi size dễ dàng", detail: "Hỗ trợ trong vòng 14 ngày" },
  { icon: Truck, title: "Giao hàng toàn quốc", detail: "Theo dõi đơn hàng rõ ràng" },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] bg-[#f4e8d8] lg:min-h-[620px]">
          <Image
            src="/images/kids-fashion-hero.png"
            alt="Bộ sưu tập áo khoác, romper và sơ mi trẻ em tông coral và xanh sage"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[60%_center] sm:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fbf5eb] via-[#fbf5eb]/85 to-transparent sm:via-[#fbf5eb]/45" />
          <div className="relative z-10 flex min-h-[560px] max-w-2xl flex-col justify-center px-7 py-16 sm:px-12 lg:min-h-[620px] lg:px-20">
            <span className="mb-5 w-fit rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-strong backdrop-blur">
              Bộ sưu tập Thu 2026
            </span>
            <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
              Dịu dàng cùng bé qua từng ngày lớn khôn.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg">
              Những thiết kế nhỏ xinh, thoải mái vận động và dễ phối cho mọi khoảnh khắc trong ngày.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">
                Khám phá bộ sưu tập <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/products?category=so-sinh" size="lg" variant="outline">
                Mua đồ sơ sinh
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">Mặc theo thế giới của bé</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Chọn theo độ tuổi và phong cách</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category, index) => (
            <Link
              key={category.label}
              href={category.href}
              className={`${category.className} group relative min-h-56 overflow-hidden rounded-[1.75rem] p-7 transition hover:-translate-y-1`}
            >
              <span className={`text-5xl font-black opacity-15 ${category.accent}`}>0{index + 1}</span>
              <div className="absolute inset-x-7 bottom-7">
                <h3 className={`text-2xl font-black ${category.accent}`}>{category.label}</h3>
                <p className="mt-2 text-sm text-foreground/70">{category.detail}</p>
                <span className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${category.accent}`}>
                  Xem sản phẩm <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">Mới về tuần này</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Bé mặc đẹp, mẹ chọn nhanh</h2>
          </div>
          <ButtonLink href="/products" variant="ghost">
            Xem tất cả <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[2rem] border border-border bg-surface p-6 shadow-[0_20px_70px_rgba(75,58,42,0.07)] md:grid-cols-3 md:p-8">
          {commitments.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-center gap-4 rounded-2xl p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sage-soft text-sage">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
