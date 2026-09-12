import { RoleGate } from "@/features/auth/session/role-gate";
import { CheckoutView } from "@/features/checkout/components/checkout-view";

export default function CheckoutPage() {
  return (
    <RoleGate allowedRoles={["CUSTOMER"]}>
      <CheckoutView />
    </RoleGate>
  );
}
