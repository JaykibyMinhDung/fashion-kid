import { PageHeader } from "@/components/ui/page-header";
import { AdminProductForm } from "@/features/catalog/components/admin-product-form";

export default function CreateProductPage() {
  return <div className="space-y-7"><PageHeader eyebrow="Admin · Catalog" title="Tạo sản phẩm" description="Tạo Product ở trạng thái DISABLED, sau đó bổ sung Variant và ảnh primary trước khi kích hoạt." /><AdminProductForm /></div>;
}
