import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { RoleGate } from "@/features/auth/session/role-gate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <PortalShell portal="admin">{children}</PortalShell>
    </RoleGate>
  );
}
