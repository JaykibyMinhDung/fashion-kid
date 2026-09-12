import { KeyRound, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StoreFooter } from "@/components/layout/store-footer";
import { StoreHeader } from "@/components/layout/store-header";
import { accountNavigation } from "@/config/navigation";
import { RoleGate } from "@/features/auth/session/role-gate";

const iconMap = { user: UserRound, map: MapPin, key: KeyRound };

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={["CUSTOMER"]}>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
          <aside className="h-fit rounded-[1.5rem] border border-border bg-surface p-4">
            <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted">
              Tài khoản của tôi
            </p>
            <nav className="space-y-1" aria-label="Điều hướng tài khoản">
              {accountNavigation.map((item) => {
                const Icon =
                  item.icon && item.icon in iconMap
                    ? iconMap[item.icon as keyof typeof iconMap]
                    : UserRound;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition hover:bg-surface-soft hover:text-foreground"
                  >
                    <Icon className="size-4" /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </main>
        <StoreFooter />
      </div>
    </RoleGate>
  );
}
