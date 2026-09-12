"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useAuth } from "../session/auth-provider";

export function LogoutButton({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const label = pending ? "Đang đăng xuất…" : "Đăng xuất";

  const handleLogout = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await logout();
    } catch {
      // AuthProvider still clears the in-memory session when the API is unavailable.
    } finally {
      router.replace("/auth/login");
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 font-bold text-brand-strong transition hover:text-brand disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      disabled={pending}
      aria-label={showLabel ? undefined : label}
      onClick={() => void handleLogout()}
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span className={showLabel ? undefined : "sr-only"}>{label}</span>
    </button>
  );
}
