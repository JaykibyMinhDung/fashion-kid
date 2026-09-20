import {
  Boxes,
  Heart,
  KeyRound,
  LayoutDashboard,
  Layers3,
  MapPin,
  Package,
  ReceiptText,
  ScrollText,
  Star,
  Ticket,
  UserRound,
  UsersRound,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  adminNavigation,
  salesNavigation,
  warehouseNavigation,
  type NavigationItem,
} from "@/config/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";

const iconMap = {
  home: LayoutDashboard,
  box: Package,
  layers: Layers3,
  warehouse: Warehouse,
  users: UsersRound,
  user: UserRound,
  key: KeyRound,
  map: MapPin,
  receipt: ReceiptText,
  ticket: Ticket,
  star: Star,
  scroll: ScrollText,
  heart: Heart,
};

const portalConfig: Record<
  "admin" | "sales" | "warehouse",
  {
    title: string;
    badge: string;
    navigation: NavigationItem[];
    colorClass: string;
  }
> = {
  admin: {
    title: "Quản trị hệ thống",
    badge: "ADMIN",
    navigation: adminNavigation,
    colorClass: "bg-brand",
  },
  sales: {
    title: "Vận hành bán hàng",
    badge: "SALES STAFF",
    navigation: salesNavigation,
    colorClass: "bg-[#bc7d42]",
  },
  warehouse: {
    title: "Vận hành kho",
    badge: "WAREHOUSE STAFF",
    navigation: warehouseNavigation,
    colorClass: "bg-sage",
  },
};

export function PortalShell({
  portal,
  children,
}: {
  portal: "admin" | "sales" | "warehouse";
  children: ReactNode;
}) {
  const config = portalConfig[portal];

  return (
    <div className="min-h-screen bg-[#f6f3ee] lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-18 items-center justify-between px-5 lg:h-22 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              className={`grid size-9 place-items-center rounded-full font-black text-white ${config.colorClass}`}
            >
              M
            </span>
            <span>
              <strong className="block text-sm">Mầm Nhỏ</strong>
              <span className="text-xs text-muted">{config.title}</span>
            </span>
          </Link>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-[10px] font-bold tracking-wide text-muted lg:hidden">
            {config.badge}
          </span>
        </div>

        <nav
          className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-4 lg:pb-0"
          aria-label={`Điều hướng ${config.title}`}
        >
          {config.navigation.map((item) => {
            const Icon = item.icon ? iconMap[item.icon] : Boxes;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted transition hover:bg-surface-soft hover:text-foreground"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5 hidden rounded-2xl bg-surface-soft p-4 lg:block">
          <p className="text-xs font-bold text-foreground">Mầm Nhỏ Store</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Thời trang trẻ em chất lượng cao
          </p>
          <LogoutButton className="mt-4 text-xs" />
        </div>
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
        {children}
      </main>
    </div>
  );
}
