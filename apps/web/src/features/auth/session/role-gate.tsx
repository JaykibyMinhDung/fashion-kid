"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import type { RoleCode } from "../contracts";
import {
  landingPathForRole,
  loginPathForReturnUrl,
} from "../role-routing";
import { useAuth } from "./auth-provider";

export function RoleGate({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly RoleCode[];
  children: ReactNode;
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAllowed =
    auth.status === "authenticated" &&
    auth.user !== null &&
    allowedRoles.includes(auth.user.role);

  useEffect(() => {
    if (auth.status === "anonymous") {
      router.replace(loginPathForReturnUrl(pathname));
      return;
    }
    if (auth.status === "authenticated" && auth.user && !isAllowed) {
      router.replace(landingPathForRole(auth.user.role));
    }
  }, [auth.status, auth.user, isAllowed, pathname, router]);

  if (!isAllowed) {
    return (
      <div
        role="status"
        className="grid min-h-[40vh] place-items-center text-sm font-semibold text-muted"
      >
        Đang kiểm tra quyền truy cập…
      </div>
    );
  }

  return children;
}
