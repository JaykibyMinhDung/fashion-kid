'use client';

import { LoaderCircle, RefreshCw } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import {
  getAuditLogs,
  type AuditLog,
  type AuditLogListResponse,
} from '../api/audit-client';

const PAGE_LIMIT = 30;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Không thể tải audit log. Vui lòng thử lại.';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AuditLogTable() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<AuditLogListResponse | null>(null);
  const [actionDraft, setActionDraft] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs(authorizedRequest, {
        page,
        limit: PAGE_LIMIT,
        action: actionFilter || undefined,
        actor: actorFilter || undefined,
      });
      setResult(data);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page, actionFilter, actorFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setActionFilter(actionDraft.trim());
  };

  if (loading && !result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải audit log…
      </p>
    );
  }

  if (error && !result) {
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

  const items: AuditLog[] = result?.items ?? [];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <label className="min-w-48 flex-1 text-xs font-bold text-muted">
            Tìm action
            <Input
              className="mt-1"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              placeholder="Ví dụ: product.created"
            />
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Lọc theo user/actor
            <Input
              className="mt-1"
              value={actorFilter}
              onChange={(e) => {
                setPage(1);
                setActorFilter(e.target.value);
              }}
              placeholder="Email hoặc ID"
            />
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            Lọc
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Làm mới
          </Button>
        </form>

        {error ? (
          <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Không có log nào"
              description="Chưa có hoạt động nào được ghi nhận, hoặc endpoint chưa được triển khai."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Actor / User</th>
                  <th className="px-5 py-4">Resource</th>
                  <th className="px-5 py-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs text-brand-strong">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {log.actor ?? log.actorId ?? (
                        <span className="italic">system</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      {log.resource
                        ? `${log.resource}${log.resourceId ? ` · ${log.resourceId}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            {result.total} bản ghi · Trang {result.page}/
            {Math.max(result.totalPages, 1)}
            {loading ? (
              <LoaderCircle
                className="ml-2 inline size-3 animate-spin"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                page >= result.totalPages || loading || result.totalPages === 0
              }
              onClick={() => setPage((v) => v + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
