import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { RoleGate } from "@/features/auth/session/role-gate";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={["SALES_STAFF"]}>
      <PortalShell portal="sales">{children}</PortalShell>
    </RoleGate>
  );
}
