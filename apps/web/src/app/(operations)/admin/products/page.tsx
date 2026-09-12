import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AdminProductsList } from "@/features/catalog/components/admin-products-list";
import { Plus } from "lucide-react";

export default function AdminProductsPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Admin · Catalog" title="Sản phẩm" description="Quản lý Product, Variant và hình ảnh bằng Catalog API. Không chỉnh số lượng tồn kho trực tiếp tại đây." action={<ButtonLink href="/admin/products/create"><Plus className="size-4" /> Thêm sản phẩm</ButtonLink>} />
      <AdminProductsList />
    </div>
  );
}
