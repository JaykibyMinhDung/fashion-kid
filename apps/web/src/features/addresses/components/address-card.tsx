"use client";

import { Check, LoaderCircle, MapPin, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Address } from "../contracts";

export function AddressCard({
  address,
  pendingAction,
  confirmingDelete,
  onEdit,
  onMakeDefault,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  address: Address;
  pendingAction: string | null;
  confirmingDelete: boolean;
  onEdit(): void;
  onMakeDefault(): void;
  onRequestDelete(): void;
  onConfirmDelete(): void;
  onCancelDelete(): void;
}) {
  const hasPendingAction = Boolean(pendingAction);
  const addressText = [
    address.addressLine,
    address.wardName,
    address.provinceName,
  ].join(", ");

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage-soft text-sage">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={hasPendingAction}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Sửa
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <h2 className="font-bold">{address.receiverName}</h2>
          {address.isDefault ? <Badge>Mặc định</Badge> : null}
        </div>
        <p className="mt-2 text-sm text-muted">{address.phone}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{addressText}</p>
        {address.note ? (
          <p className="mt-2 text-sm text-muted">Ghi chú: {address.note}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {!address.isDefault ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMakeDefault}
              disabled={hasPendingAction}
            >
              {pendingAction === `default:${address.id}` ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Đặt mặc định
            </Button>
          ) : null}
          {confirmingDelete ? (
            <>
              <span className="self-center text-sm font-medium text-red-700">
                Xác nhận xóa?
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onConfirmDelete}
                disabled={hasPendingAction}
              >
                {pendingAction === `delete:${address.id}` ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                Xóa ngay
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelDelete}
                disabled={hasPendingAction}
              >
                Hủy
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRequestDelete}
              disabled={hasPendingAction}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
