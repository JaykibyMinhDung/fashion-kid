import { CartView } from "@/features/cart/components/cart-view";
import { RoleGate } from "@/features/auth/session/role-gate";

export default function CartPage() {
  return (
    <RoleGate allowedRoles={["CUSTOMER"]}>
      <CartView />
    </RoleGate>
  );
}
