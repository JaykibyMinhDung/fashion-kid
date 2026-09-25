import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/features/auth/session/auth-provider";

// Merriweather (Google Fonts, giấy phép SIL OFL — xem fonts/OFL.txt), tự host trong repo
// để build không cần Internet. File đã rút gọn còn Latin + tiếng Việt, variable font
// trục wght 300–900 nên dùng được mọi độ đậm (kể cả font-black của tiêu đề).
const merriweather = localFont({
  src: [
    {
      path: "./fonts/merriweather-latin-vi.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "./fonts/merriweather-italic-latin-vi.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-merriweather",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

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
    <html
      lang="vi"
      className={`${merriweather.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
