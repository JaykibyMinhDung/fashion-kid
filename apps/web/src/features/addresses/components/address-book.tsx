"use client";

import { LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../api/address-client";
import type { Address } from "../contracts";
import { AddressCard } from "./address-card";
import {
  type AddressDraft,
  AddressForm,
  createEmptyAddressDraft,
  draftFromAddress,
  toCreateAddressInput,
  toUpdateAddressInput,
  validateAddressDraft,
} from "./address-form";

function addressErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể xử lý sổ địa chỉ lúc này. Vui lòng thử lại.";
}

export function AddressBook() {
  const { authorizedRequest } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAddresses(await getAddresses(authorizedRequest));
    } catch (caught) {
      setError(addressErrorMessage(caught));
    }
  }, [authorizedRequest]);

  useEffect(() => {
    let active = true;
    void getAddresses(authorizedRequest).then(
      (loaded) => {
        if (active) {
          setAddresses(loaded);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(addressErrorMessage(caught));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest]);

  const refreshAfterMutation = async (message: string) => {
    setSuccess(message);
    try {
      setAddresses(await getAddresses(authorizedRequest));
    } catch {
      setError(
        "Thao tác đã thành công nhưng danh sách chưa được làm mới. Vui lòng tải lại trang.",
      );
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(createEmptyAddressDraft());
    setConfirmingDeleteId(null);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (address: Address) => {
    setEditingId(address.id);
    setDraft(draftFromAddress(address));
    setConfirmingDeleteId(null);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setDraft(null);
    setEditingId(null);
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || pendingAction) {
      return;
    }
    const validationError = validateAddressDraft(draft);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setPendingAction("save");
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await updateAddress(
          authorizedRequest,
          editingId,
          toUpdateAddressInput(draft),
        );
        await refreshAfterMutation("Đã cập nhật địa chỉ.");
      } else {
        await createAddress(authorizedRequest, toCreateAddressInput(draft));
        await refreshAfterMutation("Đã thêm địa chỉ.");
      }
      setDraft(null);
      setEditingId(null);
    } catch (caught) {
      setError(addressErrorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  };

  const makeDefault = async (addressId: string) => {
    if (pendingAction) {
      return;
    }
    setPendingAction(`default:${addressId}`);
    setError(null);
    setSuccess(null);
    try {
      await setDefaultAddress(authorizedRequest, addressId);
      await refreshAfterMutation("Đã đổi địa chỉ mặc định.");
    } catch (caught) {
      setError(addressErrorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  };

  const remove = async (addressId: string) => {
    if (pendingAction) {
      return;
    }
    setPendingAction(`delete:${addressId}`);
    setError(null);
    setSuccess(null);
    try {
      await deleteAddress(authorizedRequest, addressId);
      await refreshAfterMutation("Đã xóa địa chỉ.");
      setConfirmingDeleteId(null);
      if (editingId === addressId) {
        setDraft(null);
        setEditingId(null);
      }
    } catch (caught) {
      setError(addressErrorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  };

  if (addresses === null && !error) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải sổ địa chỉ…
      </p>
    );
  }

  if (addresses === null) {
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{addresses.length} địa chỉ đã lưu</p>
        <Button
          type="button"
          onClick={openCreate}
          disabled={Boolean(pendingAction)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Thêm địa chỉ
        </Button>
      </div>

      {draft ? (
        <Card>
          <CardContent>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">
                {editingId ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeForm}
              >
                <X className="size-4" aria-hidden="true" />
                Đóng
              </Button>
            </div>
            <AddressForm
              draft={draft}
              isEditing={Boolean(editingId)}
              pending={pendingAction === "save"}
              error={error}
              onChange={setDraft}
              onSubmit={submit}
            />
          </CardContent>
        </Card>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p role="status" className="text-sm font-medium text-green-700">
          {success}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <EmptyState
          title="Chưa có địa chỉ nhận hàng"
          description="Thêm địa chỉ đầu tiên; hệ thống sẽ tự đặt địa chỉ đó làm mặc định."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Thêm địa chỉ đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              pendingAction={pendingAction}
              confirmingDelete={confirmingDeleteId === address.id}
              onEdit={() => openEdit(address)}
              onMakeDefault={() => void makeDefault(address.id)}
              onRequestDelete={() => setConfirmingDeleteId(address.id)}
              onConfirmDelete={() => void remove(address.id)}
              onCancelDelete={() => setConfirmingDeleteId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
