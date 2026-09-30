"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Layers3,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/session/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
  type AdminCategory,
  type CreateCategoryInput,
} from "@/features/catalog/api/category-client";

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: "ACTIVE" | "DISABLED" }) {
  return status === "ACTIVE" ? (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
      Tắt
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Create / Edit modal                                                */
/* ------------------------------------------------------------------ */

interface CategoryFormProps {
  categories: AdminCategory[];
  editing: AdminCategory | null;
  onClose: () => void;
  onSave: (input: CreateCategoryInput, id?: string) => Promise<void>;
}

function CategoryForm({ categories, editing, onClose, onSave }: CategoryFormProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [parentId, setParentId] = useState(editing?.parentId ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(
    editing?.status ?? "ACTIVE",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editing) setSlug(autoSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Tên và slug không được để trống.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(
        {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          parentId: parentId || null,
          ...(editing ? {} : { status }),
        },
        editing?.id,
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  const availableParents = categories.filter((c) => c.id !== editing?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {editing ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
            <button onClick={onClose} className="text-muted hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Tên danh mục *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                maxLength={150}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand"
                maxLength={180}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                maxLength={2000}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Danh mục cha
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">— Không có —</option>
                {availableParents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {!editing && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "ACTIVE" | "DISABLED")
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="DISABLED">Tắt</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function CategoriesPage() {
  const { authorizedRequest } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminCategories(authorizedRequest, {
        q: search || undefined,
        status: statusFilter || undefined,
      });
      setCategories(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (input: CreateCategoryInput, id?: string) => {
    if (id) {
      await updateCategory(authorizedRequest, id, input);
    } else {
      await createCategory(authorizedRequest, input);
    }
    await fetchCategories();
  };

  const handleToggleStatus = async (cat: AdminCategory) => {
    setTogglingId(cat.id);
    try {
      const newStatus = cat.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      await setCategoryStatus(authorizedRequest, cat.id, newStatus);
      await fetchCategories();
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  const parentName = (parentId: string | null) => {
    if (!parentId) return "—";
    return categories.find((c) => c.id === parentId)?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Catalog"
        title="Danh mục sản phẩm"
        description="Quản lý danh mục phân nhóm sản phẩm trên cửa hàng."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Tìm theo tên danh mục…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="DISABLED">Tắt</option>
        </select>

        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          size="sm"
        >
          <Plus className="mr-1 size-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-semibold text-muted">Tên</th>
                <th className="px-4 py-3 font-semibold text-muted">Slug</th>
                <th className="hidden px-4 py-3 font-semibold text-muted md:table-cell">
                  Danh mục cha
                </th>
                <th className="px-4 py-3 font-semibold text-muted">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-surface-soft" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-surface-soft" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-surface-soft" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-surface-soft" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-surface-soft" />
                    </td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted"
                  >
                    <Layers3 className="mx-auto mb-2 size-8" />
                    Không tìm thấy danh mục nào.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-border last:border-0 hover:bg-surface-soft/50"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {cat.slug}
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {parentName(cat.parentId)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cat.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(cat);
                            setShowForm(true);
                          }}
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-soft hover:text-foreground"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          disabled={togglingId === cat.id}
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-soft hover:text-foreground disabled:opacity-50"
                          title={
                            cat.status === "ACTIVE" ? "Tắt danh mục" : "Bật danh mục"
                          }
                        >
                          {cat.status === "ACTIVE" ? (
                            <ToggleRight className="size-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showForm && (
        <CategoryForm
          categories={categories}
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
