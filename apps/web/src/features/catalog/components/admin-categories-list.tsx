'use client';

import { LoaderCircle, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import type { AdminCatalogCategory, AdminEntityStatus } from '../api/admin-catalog-client';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Không thể tải danh sách danh mục. Vui lòng thử lại.';
}

function statusLabel(status: AdminEntityStatus): string {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa';
}

type StatusFilter = AdminEntityStatus | '';

export function AdminCategoriesList() {
  const { authorizedRequest } = useAuth();
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [filtered, setFiltered] = useState<AdminCatalogCategory[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authorizedRequest<AdminCatalogCategory[]>(
        '/api/v1/admin/catalog/categories',
      );
      setCategories(data);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side filter
  useEffect(() => {
    let result = categories;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    setFiltered(result);
  }, [categories, search, statusFilter]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
  };

  const toggleStatus = async (category: AdminCatalogCategory) => {
    const nextStatus: AdminEntityStatus =
      category.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (
      nextStatus === 'DISABLED' &&
      !window.confirm(`Vô hiệu hóa danh mục "${category.name}"?`)
    ) {
      return;
    }
    if (pendingId) return;
    setPendingId(category.id);
    setError(null);
    setSuccess(null);
    try {
      await authorizedRequest(`/api/v1/admin/catalog/categories/${category.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
        headers: { 'content-type': 'application/json' },
      });
      setSuccess(
        nextStatus === 'ACTIVE'
          ? 'Đã kích hoạt danh mục.'
          : 'Đã vô hiệu hóa danh mục.',
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải danh mục…
      </p>
    );
  }

  if (!loading && error && categories.length === 0) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <label className="min-w-56 flex-1 text-xs font-bold text-muted">
            Tìm kiếm
            <span className="relative mt-1 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Tên hoặc slug danh mục"
                className="pl-9"
              />
            </span>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Trạng thái
            <Select
              className="mt-1"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="DISABLED">Đã vô hiệu hóa</option>
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" /> Tìm
          </Button>
        </form>

        {error ? (
          <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="px-5 pt-4 text-sm font-medium text-green-700">
            {success}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có danh mục phù hợp"
              description="Thử thay đổi bộ lọc hoặc tạo một danh mục mới."
              action={
                <Button
                  type="button"
                  size="sm"
                  onClick={() => alert('Chức năng tạo danh mục đang phát triển.')}
                >
                  <Plus className="size-4" /> Tạo danh mục
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Tên danh mục</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4">Danh mục cha</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((category) => {
                  const pending = pendingId === category.id;
                  const parent = categories.find((c) => c.id === category.parentId);
                  return (
                    <tr key={category.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold">{category.name}</p>
                        {category.description ? (
                          <p className="mt-0.5 text-xs text-muted line-clamp-1">
                            {category.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted">
                        {category.slug}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {parent ? parent.name : <span className="text-xs italic">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={
                            category.status === 'ACTIVE'
                              ? 'bg-sage-soft text-sage'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {statusLabel(category.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={Boolean(pendingId)}
                            onClick={() => void toggleStatus(category)}
                          >
                            {pending ? (
                              <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : null}
                            {category.status === 'ACTIVE' ? 'Tắt' : 'Kích hoạt'}
                          </Button>
                          <button
                            type="button"
                            className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:text-brand-strong"
                            aria-label={`Sửa ${category.name}`}
                            onClick={() =>
                              alert('Chức năng sửa danh mục đang phát triển.')
                            }
                          >
                            <Pencil className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-sm text-muted">
        {filtered.length} / {categories.length} danh mục
        {loading ? (
          <LoaderCircle
            className="ml-2 inline size-3 animate-spin"
            aria-hidden="true"
          />
        ) : null}
      </p>
    </div>
  );
}
