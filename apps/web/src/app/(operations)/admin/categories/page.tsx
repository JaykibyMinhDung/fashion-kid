import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { AdminCategoriesList } from '@/features/catalog/components/admin-categories-list';

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · Catalog"
        title="Danh mục sản phẩm"
        description="Master data phục vụ phân nhóm sản phẩm và bộ lọc storefront."
        action={
          <Button
            type="button"
            onClick={() => alert('Chức năng tạo danh mục đang phát triển.')}
          >
            <Plus className="size-4" /> Thêm danh mục
          </Button>
        }
      />
      <AdminCategoriesList />
    </div>
  );
}
