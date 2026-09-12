import { PageHeader } from "@/components/ui/page-header";
import { AddressBook } from "@/features/addresses/components/address-book";

export default function AddressesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tài khoản"
        title="Địa chỉ nhận hàng"
        description="Quản lý địa chỉ nhận hàng và lựa chọn địa chỉ mặc định cho đơn hàng."
      />
      <AddressBook />
    </div>
  );
}
