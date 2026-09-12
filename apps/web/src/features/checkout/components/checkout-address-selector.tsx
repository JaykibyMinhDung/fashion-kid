"use client";

import { CheckCircle2, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Address } from "@/features/addresses/contracts";

export function CheckoutAddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
}: {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect(addressId: string): void;
}) {
  if (addresses.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border p-6 text-center">
        <MapPin className="mx-auto h-8 w-8 text-muted mb-2" />
        <p className="text-sm font-medium text-foreground">
          Bạn chưa có sổ địa chỉ nhận hàng
        </p>
        <p className="text-xs text-muted mt-1 mb-4">
          Vui lòng thêm địa chỉ nhận hàng trước khi tiến hành thanh toán.
        </p>
        <Link
          href="/account/addresses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <Plus className="h-4 w-4" />
          Thêm địa chỉ ngay
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          Địa chỉ giao hàng ({addresses.length})
        </h3>
        <Link
          href="/account/addresses"
          className="text-xs font-semibold text-brand hover:underline"
        >
          Quản lý sổ địa chỉ
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((address) => {
          const isSelected = address.id === selectedAddressId;
          return (
            <div
              key={address.id}
              onClick={() => onSelect(address.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 transition ${
                isSelected
                  ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                  : "border-border bg-surface hover:border-brand/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">
                    {address.receiverName}
                  </span>
                  {address.isDefault && (
                    <Badge className="text-[10px] px-1.5 py-0.5">
                      Mặc định
                    </Badge>
                  )}
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-border shrink-0" />
                )}
              </div>

              <div className="mt-1 text-xs text-muted">
                {address.phone}
              </div>

              <div className="mt-2 text-xs text-foreground/80 leading-relaxed">
                {address.addressLine}, {address.wardName},{" "}
                {address.provinceName}
              </div>

              {address.note && (
                <div className="mt-1.5 text-[11px] text-muted italic">
                  Ghi chú: {address.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
