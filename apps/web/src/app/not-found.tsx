import { ArrowLeft, SearchX } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft text-brand-strong"><SearchX className="size-7" /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">404 · Không tìm thấy</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">Trang này chưa có trong tủ đồ.</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">Đường dẫn có thể đã thay đổi hoặc nội dung đang được chuẩn bị theo tài liệu của day tiếp theo.</p>
        <ButtonLink href="/" className="mt-7"><ArrowLeft className="size-4" /> Về trang chủ</ButtonLink>
      </div>
    </main>
  );
}
