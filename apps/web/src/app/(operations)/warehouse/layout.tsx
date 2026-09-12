import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { RoleGate } from "@/features/auth/session/role-gate";

export default function WarehouseLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={["WAREHOUSE_STAFF"]}>
      <PortalShell portal="warehouse">{children}</PortalShell>
    </RoleGate>
  );
}
