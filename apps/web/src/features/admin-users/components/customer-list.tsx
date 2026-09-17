'use client';

import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getAdminUsers } from '@/features/admin-users/api/admin-user-client';
import type { AdminUser, AdminUserListResponse } from '@/features/admin-users/contracts';
import { Button } from '@/components/ui/button';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

function statusLabel(status: AdminUser['status']): string {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa';
}

const PAGE_LIMIT = 20;

export function CustomerList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<AdminUserListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminUsers(authorizedRequest, {
          page: p,
          limit: PAGE_LIMIT,
          role: 'CUSTOMER',
          sort: 'createdAt:desc',
        });
        setResult(data);
      } catch {
        setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [authorizedRequest],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <LoaderCircle className="animate-spin" />
        <span className="ml-2 text-sm">Đang tải…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <p className="text-sm text-rose-700">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void load(page)}
        >
          <RefreshCw className="size-4" /> Thử lại
        </Button>
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return (
      <EmptyState
        title="Chưa có khách hàng"
        description="Không tìm thấy khách hàng nào trong hệ thống."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Tổng <span className="font-semibold text-foreground">{result.total}</span> khách hàng
      </p>

      <div className="overflow-x-auto rounded-[1.5rem] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-widest text-muted">
              <th className="px-5 py-4">Tên</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Điện thoại</th>
              <th className="px-5 py-4">Ngày tạo</th>
              <th className="px-5 py-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-surface-soft"
              >
                <td className="px-5 py-3 font-medium">{user.fullName || '—'}</td>
                <td className="px-5 py-3 text-muted">{user.email}</td>
                <td className="px-5 py-3 text-muted">{user.phone ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{formatDate(user.createdAt)}</td>
                <td className="px-5 py-3">
                  <Badge
                    className={
                      user.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }
                  >
                    {statusLabel(user.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted">
            Trang {page} / {result.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
