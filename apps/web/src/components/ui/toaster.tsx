"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Vùng hiển thị toast dùng chung cho toàn bộ ứng dụng (gắn một lần ở root layout). */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
    />
  );
}
