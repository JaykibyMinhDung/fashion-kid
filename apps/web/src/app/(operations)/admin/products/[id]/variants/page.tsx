import { PageHeader } from "@/components/ui/page-header";
import { AdminProductVariants } from "@/features/catalog/components/admin-product-variants";

export default async function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-7"><PageHeader eyebrow="Admin · Catalog" title="Biến thể sản phẩm" description="Quản lý SKU immutable, Size/Color, price decimal string và activation ở cấp Product Variant." /><AdminProductVariants productId={id} /></div>;
}
