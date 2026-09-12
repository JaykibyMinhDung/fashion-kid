import { RoutePlaceholder } from "@/components/shared/route-placeholder";

export default function CategoriesPage() {
  return <RoutePlaceholder eyebrow="Admin · Catalog" title="Danh mục sản phẩm" description="Master data cơ bản phục vụ phân nhóm sản phẩm và bộ lọc storefront." checklist={["Danh sách Category với search và trạng thái", "Tạo/chỉnh sửa tên và slug", "Disable thay vì hard delete khi đã được tham chiếu"]} documentStatus="Đã dựng route" />;
}
