import { PageHeader } from "@/components/ui/page-header";
import { AdminProductForm } from "@/features/catalog/components/admin-product-form";
import { AdminProductImages } from "@/features/catalog/components/admin-product-images";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-7"><PageHeader eyebrow="Admin · Catalog" title="Chỉnh sửa sản phẩm" description="Thông tin Product và vùng quản lý ảnh được tách khỏi Variant và Inventory." /><AdminProductForm productId={id} /><AdminProductImages productId={id} /></div>;
}
