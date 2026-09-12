import Link from "next/link";

const footerLinks = [
  { label: "Về Mầm Nhỏ", href: "/" },
  { label: "Hướng dẫn chọn size", href: "/products" },
  { label: "Chính sách đổi trả", href: "/" },
  { label: "Liên hệ", href: "/" },
];

export function StoreFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-[#f2ebe2]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-brand font-black text-white">M</span>
            <span className="text-xl font-black tracking-[-0.04em]">Mầm Nhỏ</span>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Trang phục mềm mại, dễ vận động và được chọn lọc cho từng bước lớn khôn của bé.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em]">Khám phá</h2>
          <ul className="space-y-3 text-sm text-muted">
            {footerLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="transition hover:text-brand-strong">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em]">Chăm sóc khách hàng</h2>
          <p className="text-sm leading-6 text-muted">Hotline: 1900 6868</p>
          <p className="text-sm leading-6 text-muted">Thứ Hai – Chủ Nhật, 8:00–21:00</p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted">
        © 2026 Mầm Nhỏ. Bản dựng phục vụ đồ án thương mại điện tử.
      </div>
    </footer>
  );
}
