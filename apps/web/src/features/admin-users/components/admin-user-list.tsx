"use client";

import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../api/admin-user-client";
import {
  ADMIN_USER_ROLES,
  type AdminUser,
  type AdminUserListResponse,
  type AdminUserStatus,
} from "../contracts";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải danh sách người dùng. Vui lòng thử lại.";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Chưa đăng nhập";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: AdminUserStatus): string {
  return status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa";
}

export function AdminUserList() {
  const { authorizedRequest, user: currentUser } = useAuth();
  const [result, setResult] = useState<AdminUserListResponse | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUser["role"] | "">("");
  const [status, setStatus] = useState<AdminUserStatus | "">("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getAdminUsers(authorizedRequest, {
          page,
          limit: PAGE_LIMIT,
          q: search || undefined,
          role: role || undefined,
          status: status || undefined,
          sort,
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page, role, search, sort, status]);

  useEffect(() => {
    let active = true;
    void getAdminUsers(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      q: search || undefined,
      role: role || undefined,
      status: status || undefined,
      sort,
    }).then(
      (loaded) => {
        if (active) {
          setResult(loaded);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(errorMessage(caught));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, page, role, search, sort, status]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const changeStatus = async (target: AdminUser) => {
    const nextStatus: AdminUserStatus =
      target.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (
      nextStatus === "DISABLED" &&
      !window.confirm(`Vô hiệu hóa tài khoản ${target.email}?`)
    ) {
      return;
    }
    if (pendingId) {
      return;
    }
    setPendingId(`${target.id}:status`);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminUserStatus(authorizedRequest, target.id, nextStatus);
      setSuccess(
        nextStatus === "ACTIVE"
          ? "Đã kích hoạt lại người dùng."
          : "Đã vô hiệu hóa người dùng.",
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  };

  const changeRole = async (target: AdminUser, nextRole: AdminUser["role"]) => {
    if (nextRole === target.role || pendingId) {
      return;
    }
    setPendingId(`${target.id}:role`);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminUserRole(authorizedRequest, target.id, nextRole);
      setSuccess("Đã cập nhật vai trò người dùng.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải danh sách người dùng…
      </p>
    );
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Thử lại
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
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Email, họ tên hoặc số điện thoại"
                className="pl-9"
              />
            </span>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Vai trò
            <Select
              className="mt-1"
              value={role}
              onChange={(event) => {
                setPage(1);
                setRole(event.target.value as AdminUser["role"] | "");
              }}
            >
              <option value="">Mọi vai trò</option>
              {ADMIN_USER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Trạng thái
            <Select
              className="mt-1"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as AdminUserStatus | "");
              }}
            >
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="DISABLED">Đã vô hiệu hóa</option>
            </Select>
          </label>
          <label className="w-48 text-xs font-bold text-muted">
            Sắp xếp
            <Select
              className="mt-1"
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value);
              }}
            >
              <option value="createdAt:desc">Mới tạo trước</option>
              <option value="createdAt:asc">Cũ tạo trước</option>
              <option value="fullName:asc">Tên A–Z</option>
              <option value="email:asc">Email A–Z</option>
              <option value="lastLoginAt:desc">Đăng nhập gần đây</option>
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" />
            Tìm
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

        {result.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Không tìm thấy người dùng"
              description="Thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Người dùng</th>
                  <th className="px-5 py-4">Vai trò</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Đăng nhập cuối</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((target) => {
                  const isSelf = target.id === currentUser?.id;
                  const pending = pendingId?.startsWith(`${target.id}:`);
                  return (
                    <tr key={target.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold">{target.fullName}</p>
                        <p className="text-xs text-muted">{target.email}</p>
                        {target.phone ? (
                          <p className="text-xs text-muted">{target.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <Select
                          aria-label={`Vai trò của ${target.email}`}
                          value={target.role}
                          disabled={isSelf || Boolean(pendingId)}
                          onChange={(event) =>
                            void changeRole(
                              target,
                              event.target.value as AdminUser["role"],
                            )
                          }
                        >
                          {ADMIN_USER_ROLES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={
                            target.status === "ACTIVE"
                              ? "bg-sage-soft text-sage"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {target.status}
                        </Badge>
                        <p className="mt-1 text-xs text-muted">
                          {statusLabel(target.status)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {formatDate(target.lastLoginAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSelf || Boolean(pendingId)}
                          onClick={() => void changeStatus(target)}
                        >
                          {pending ? (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                          ) : null}
                          {target.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {result.total} người dùng · Trang {result.page}/{Math.max(result.totalPages, 1)}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Trang trước
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= result.totalPages || loading || result.totalPages === 0}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>
    </div>
  );
}
