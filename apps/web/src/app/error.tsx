"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">Có lỗi xảy ra</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Mầm Nhỏ chưa thể tải nội dung này.</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">Vui lòng thử lại. Thông tin kỹ thuật sẽ không được hiển thị trực tiếp cho người dùng.</p>
        <Button onClick={reset} className="mt-7"><RefreshCw className="size-4" /> Thử lại</Button>
      </div>
    </main>
  );
}
