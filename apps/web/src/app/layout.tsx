import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/session/auth-provider";

export const metadata: Metadata = {
  title: {
    default: "Mầm Nhỏ | Thời trang trẻ em",
    template: "%s | Mầm Nhỏ",
  },
  description:
    "Thời trang trẻ em mềm mại, thoải mái và được chọn lọc cho những ngày lớn khôn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
