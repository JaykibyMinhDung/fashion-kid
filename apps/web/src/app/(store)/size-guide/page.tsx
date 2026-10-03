"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ChevronRight,
  HelpCircle,
  Info,
  Ruler,
  Scale,
  Sparkles,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SizeSpec {
  size: string;
  age: string;
  weight: string;
  height: string;
  chest?: string;
  waist?: string;
  recommendedFor: string;
}

const newbornSizes: SizeSpec[] = [
  {
    size: "0 - 3M",
    age: "0 - 3 tháng",
    weight: "3.0 - 5.5 kg",
    height: "50 - 59 cm",
    chest: "40 - 44 cm",
    waist: "38 - 42 cm",
    recommendedFor: "Bé sơ sinh, đồ liền thân (bodysuit, romper)",
  },
  {
    size: "3 - 6M",
    age: "3 - 6 tháng",
    weight: "5.5 - 7.5 kg",
    height: "59 - 66 cm",
    chest: "44 - 46 cm",
    waist: "42 - 44 cm",
    recommendedFor: "Bé bắt đầu biết lẫy, cử động nhiều",
  },
  {
    size: "6 - 9M",
    age: "6 - 9 tháng",
    weight: "7.5 - 9.0 kg",
    height: "66 - 73 cm",
    chest: "46 - 48 cm",
    waist: "44 - 46 cm",
    recommendedFor: "Bé tập ngồi, tập bò",
  },
  {
    size: "9 - 12M",
    age: "9 - 12 tháng",
    weight: "9.0 - 11.0 kg",
    height: "73 - 80 cm",
    chest: "48 - 50 cm",
    waist: "46 - 48 cm",
    recommendedFor: "Bé vịn đứng, chập chững bước đi",
  },
];

const toddlerSizes: SizeSpec[] = [
  {
    size: "80 (1T)",
    age: "1 - 2 tuổi",
    weight: "10.0 - 12.0 kg",
    height: "75 - 85 cm",
    chest: "50 - 52 cm",
    waist: "48 - 50 cm",
    recommendedFor: "Bé đi vững, ưa vận động chạy nhảy",
  },
  {
    size: "90 (2T)",
    age: "2 - 3 tuổi",
    weight: "12.0 - 14.5 kg",
    height: "85 - 95 cm",
    chest: "52 - 55 cm",
    waist: "50 - 52 cm",
    recommendedFor: "Bé đi nhà trẻ, đồ bộ mặc nhà & dạo phố",
  },
  {
    size: "100 (3T)",
    age: "3 - 4 tuổi",
    weight: "14.5 - 16.5 kg",
    height: "95 - 105 cm",
    chest: "55 - 58 cm",
    waist: "52 - 54 cm",
    recommendedFor: "Bé mầm non, trang phục thoáng mát",
  },
];

const kidSizes: SizeSpec[] = [
  {
    size: "110 (4T)",
    age: "4 - 5 tuổi",
    weight: "16.5 - 19.5 kg",
    height: "105 - 115 cm",
    chest: "58 - 61 cm",
    waist: "54 - 56 cm",
    recommendedFor: "Bé mẫu giáo nhỡ - lớn",
  },
  {
    size: "120 (5T)",
    age: "5 - 6 tuổi",
    weight: "19.5 - 23.0 kg",
    height: "115 - 125 cm",
    chest: "61 - 64 cm",
    waist: "56 - 58 cm",
    recommendedFor: "Bé chuẩn bị vào lớp một",
  },
];

function calculateRecommendedSize(
  weightKg: number | null,
  heightCm: number | null,
): {
  size: string;
  age: string;
  tip: string;
} | null {
  if (!weightKg && !heightCm) return null;

  const w = weightKg ?? 0;
  const h = heightCm ?? 0;

  if (w > 0 && w < 5.5) {
    return {
      size: "0 - 3M",
      age: "0 - 3 tháng",
      tip: "Kích cỡ chuẩn cho bé sơ sinh, mềm mại và ôm ấp vừa vặn.",
    };
  }
  if ((w >= 5.5 && w < 7.5) || (h > 0 && h < 66)) {
    return {
      size: "3 - 6M",
      age: "3 - 6 tháng",
      tip: "Size phù hợp khi bé bắt đầu lẫy. Nếu bé trộm vía bụ bẫm, mẹ hãy cân nhắc chọn 6 - 9M nhé.",
    };
  }
  if ((w >= 7.5 && w < 9.0) || (h >= 66 && h < 73)) {
    return {
      size: "6 - 9M",
      age: "6 - 9 tháng",
      tip: "Rộng rãi thoải mái cho bé tập bò và khám phá thế giới xung quanh.",
    };
  }
  if ((w >= 9.0 && w < 11.0) || (h >= 73 && h < 80)) {
    return {
      size: "9 - 12M",
      age: "9 - 12 tháng",
      tip: "Phù hợp giai đoạn bé chập chững tập đi.",
    };
  }
  if ((w >= 11.0 && w < 13.0) || (h >= 80 && h < 90)) {
    return {
      size: "Size 80 / 90 (1 - 2 tuổi)",
      age: "1 - 2 tuổi",
      tip: "Size 80 vừa vặn hoặc Size 90 thoải mái khi bé mặc bỉm tã dày vào ban đêm.",
    };
  }
  if ((w >= 13.0 && w < 15.5) || (h >= 90 && h < 100)) {
    return {
      size: "Size 90 / 100 (2 - 3 tuổi)",
      age: "2 - 3 tuổi",
      tip: "Size 100 sẽ giúp bé vận động cả ngày không bị gò bó đũng quần.",
    };
  }
  if ((w >= 15.5 && w < 18.5) || (h >= 100 && h < 110)) {
    return {
      size: "Size 100 / 110 (3 - 4 tuổi)",
      age: "3 - 4 tuổi",
      tip: "Thích hợp cho bé đi mẫu giáo, chạy nhảy tự tin cả ngày.",
    };
  }
  if (w >= 18.5 || h >= 110) {
    return {
      size: "Size 110 / 120 (4 - 6 tuổi)",
      age: "4 - 6 tuổi",
      tip: "Kích cỡ lớn nhất hiện có tại Mầm Nhỏ với form dáng thoải mái, dễ chịu.",
    };
  }

  return {
    size: "Size 90 (2 - 3 tuổi)",
    age: "2 - 3 tuổi",
    tip: "Kích cỡ trung bình phổ biến cho các bé năng động.",
  };
}

export default function SizeGuidePage() {
  const [activeTab, setActiveTab] = useState<"newborn" | "toddler" | "kids">("newborn");
  const [weightInput, setWeightInput] = useState<string>("10.5");
  const [heightInput, setHeightInput] = useState<string>("78");
  const weightInputId = useId();
  const heightInputId = useId();

  const weightNum = parseFloat(weightInput) || null;
  const heightNum = parseFloat(heightInput) || null;

  const recommendation = useMemo(() => {
    return calculateRecommendedSize(weightNum, heightNum);
  }, [weightNum, heightNum]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">Hướng dẫn chọn size</span>
      </nav>

      {/* Header */}
      <div className="max-w-3xl">
        <Badge className="mb-3 bg-brand-soft text-brand-strong">Cẩm nang cho mẹ</Badge>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Bảng kích cỡ & Hướng dẫn chọn size cho bé
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Mỗi bé đều có tốc độ phát triển và vóc dáng riêng biệt. Tại Mầm Nhỏ, các mẫu thiết kế
          đều được may với độ dung sai thoải mái để con luôn dễ chịu trong mọi hoạt động.
        </p>
      </div>

      {/* Interactive Size Calculator */}
      <Card className="mt-8 border-brand/30 bg-gradient-to-br from-[#faf6f1] via-[#f7f0e6] to-[#f1e6d7] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <Calculator className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Công cụ gợi ý size nhanh</h2>
            <p className="text-xs text-muted sm:text-sm">
              Nhập số cân nặng và chiều cao hiện tại của bé để nhận đề xuất size chuẩn xác nhất:
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor={weightInputId} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Scale className="size-4 text-brand" /> Cân nặng của bé (kg)
            </label>
            <Input
              id={weightInputId}
              type="number"
              step="0.5"
              min="2"
              max="35"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="VD: 10.5"
              className="bg-white font-medium"
            />
          </div>

          <div>
            <label htmlFor={heightInputId} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Ruler className="size-4 text-brand" /> Chiều cao của bé (cm)
            </label>
            <Input
              id={heightInputId}
              type="number"
              step="1"
              min="45"
              max="140"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              placeholder="VD: 78"
              className="bg-white font-medium"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <div className="h-full rounded-2xl border border-brand/30 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Gợi ý từ Mầm Nhỏ</span>
                <Sparkles className="size-4 text-brand" />
              </div>
              {recommendation ? (
                <div className="mt-2">
                  <p className="text-xl font-black text-brand-strong">{recommendation.size}</p>
                  <p className="text-xs font-semibold text-foreground">
                    Độ tuổi tương ứng: {recommendation.age}
                  </p>
                  <p className="mt-1 text-xs text-muted">{recommendation.tip}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  Vui lòng nhập cân nặng hoặc chiều cao để xem gợi ý.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/70 p-3 text-xs text-muted">
          <Info className="size-4 shrink-0 text-brand" />
          <span>
            <strong>Mẹo nhỏ từ Mầm Nhỏ:</strong> Trẻ em lớn rất nhanh! Nếu số đo của bé nằm ở ranh
            giới giữa 2 size hoặc bé mặc bỉm tã dày vào ban đêm, ba mẹ nên ưu tiên chọn tăng thêm 1
            size để bé mặc được lâu và thoải mái hơn.
          </span>
        </div>
      </Card>

      {/* Size Chart Tables */}
      <section className="mt-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bảng thông số chi tiết theo độ tuổi
            </h2>
            <p className="text-sm text-muted">
              Số đo chuẩn theo phom người em bé Việt Nam, đã tính độ cử động thoải mái
            </p>
          </div>

          {/* Tab selector */}
          <div className="inline-flex rounded-xl bg-surface-soft p-1">
            <button
              type="button"
              onClick={() => setActiveTab("newborn")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition sm:text-sm ${
                activeTab === "newborn"
                  ? "bg-white text-brand shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sơ sinh (0 - 12M)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("toddler")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition sm:text-sm ${
                activeTab === "toddler"
                  ? "bg-white text-brand shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Bé tập đi (1 - 3T)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kids")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition sm:text-sm ${
                activeTab === "kids"
                  ? "bg-white text-brand shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Bé nhỡ (3 - 6T)
            </button>
          </div>
        </div>

        {/* Table container */}
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f7f2ec] text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-4">Kích cỡ (Size)</th>
                  <th className="px-5 py-4">Độ tuổi tham khảo</th>
                  <th className="px-5 py-4">Cân nặng (kg)</th>
                  <th className="px-5 py-4">Chiều cao (cm)</th>
                  <th className="px-5 py-4">Vòng ngực</th>
                  <th className="px-5 py-4">Gợi ý sử dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(activeTab === "newborn"
                  ? newbornSizes
                  : activeTab === "toddler"
                    ? toddlerSizes
                    : kidSizes
                ).map((item) => (
                  <tr key={item.size} className="hover:bg-surface-soft/60 transition">
                    <td className="px-5 py-4 font-black text-brand-strong">{item.size}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{item.age}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{item.weight}</td>
                    <td className="px-5 py-4 text-muted">{item.height}</td>
                    <td className="px-5 py-4 text-muted">{item.chest ?? "—"}</td>
                    <td className="px-5 py-4 text-xs text-muted">{item.recommendedFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Measurement Tips */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          3 Bước đo kích cỡ cho bé tại nhà
        </h2>
        <p className="mt-1 text-sm text-muted">
          Bé thường hiếu động khi đo, mẹ hãy chuẩn bị thước dây mềm và làm theo các mẹo sau nhé:
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Card className="border-border/80">
            <CardContent className="p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand font-black">
                1
              </div>
              <h3 className="mt-4 font-bold text-foreground">Đo chiều cao của bé</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                • Với bé dưới 1 tuổi: Đặt bé nằm thẳng trên mặt phẳng, đo từ đỉnh đầu đến gót chân.
                <br />• Với bé đã biết đứng: Đứng sát vào tường không mang dép, đánh dấu đỉnh đầu và
                đo thẳng xuống sàn.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-sage-soft text-sage font-black">
                2
              </div>
              <h3 className="mt-4 font-bold text-foreground">Đo vòng ngực & vòng bụng</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                • Quấn thước dây quanh phần ngực nở nhất (dưới nách).
                <br />• Luồn thêm 1 ngón tay trỏ vào giữa thước và người bé để giữ độ cử động thoải
                mái khi bé thở hoặc no bụng.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-[#fbe8e4] text-[#b84d43] font-black">
                3
              </div>
              <h3 className="mt-4 font-bold text-foreground">Đo chiều dài quần áo</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                • Chiều dài áo: Đo từ điểm cao nhất của vai xuống qua mông nhẹ.
                <br />• Chiều dài quần: Đo từ cạp eo xuống mắt cá chân (trừ hao nếu mẹ thích xắn gấu
                quần tạo phong cách).
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Assurance banner */}
      <section className="mt-14 flex flex-col items-center justify-between gap-6 rounded-[2rem] border border-border bg-[#f6f2ec] p-6 sm:flex-row sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white">
            <Truck className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Vẫn còn băn khoăn về size cho con?</h3>
            <p className="text-xs text-muted sm:text-sm">
              Đừng lo lắng! Mầm Nhỏ hỗ trợ <strong>đổi size tận nhà trong vòng 14 ngày</strong> hoàn
              toàn tiện lợi và nhanh chóng.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <ButtonLink href="/return-policy" variant="outline" size="sm">
            Xem chính sách đổi trả
          </ButtonLink>
          <ButtonLink href="/products" size="sm">
            Mua sắm ngay
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
