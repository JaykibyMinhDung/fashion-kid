"use client";

import { LoaderCircle, Save } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  Address,
  CreateAddressInput,
  UpdateAddressInput,
} from "../contracts";

export type AddressDraft = {
  receiverName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
  note: string;
  isDefault: boolean;
};

export function createEmptyAddressDraft(): AddressDraft {
  return {
    receiverName: "",
    phone: "",
    addressLine: "",
    wardCode: "",
    wardName: "",
    provinceCode: "",
    provinceName: "",
    note: "",
    isDefault: false,
  };
}

export function draftFromAddress(address: Address): AddressDraft {
  return {
    receiverName: address.receiverName,
    phone: address.phone,
    addressLine: address.addressLine,
    wardCode: address.wardCode,
    wardName: address.wardName,
    provinceCode: address.provinceCode,
    provinceName: address.provinceName,
    note: address.note ?? "",
    isDefault: address.isDefault,
  };
}

function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function validateAddressDraft(draft: AddressDraft): string | null {
  const required: Array<[string, number, string]> = [
    [draft.receiverName, 150, "Tên người nhận"],
    [draft.addressLine, 255, "Địa chỉ chi tiết"],
    [draft.wardCode, 50, "Mã phường/xã"],
    [draft.wardName, 120, "Phường/xã"],
    [draft.provinceCode, 50, "Mã tỉnh/thành"],
    [draft.provinceName, 120, "Tỉnh/thành"],
  ];
  for (const [value, maximum, label] of required) {
    const length = [...value.trim()].length;
    if (length === 0 || length > maximum) {
      return `${label} là bắt buộc và không được vượt quá ${maximum} ký tự.`;
    }
  }
  if (!/^\+?[0-9]{8,15}$/.test(normalizePhone(draft.phone))) {
    return "Số điện thoại cần có từ 8 đến 15 chữ số và có thể bắt đầu bằng dấu +.";
  }
  if ([...draft.note.trim()].length > 255) {
    return "Ghi chú không được vượt quá 255 ký tự.";
  }
  return null;
}

export function toCreateAddressInput(draft: AddressDraft): CreateAddressInput {
  return {
    receiverName: draft.receiverName.trim(),
    phone: normalizePhone(draft.phone),
    addressLine: draft.addressLine.trim(),
    wardCode: draft.wardCode.trim(),
    wardName: draft.wardName.trim(),
    provinceCode: draft.provinceCode.trim(),
    provinceName: draft.provinceName.trim(),
    note: draft.note.trim() || null,
    isDefault: draft.isDefault,
  };
}

export function toUpdateAddressInput(draft: AddressDraft): UpdateAddressInput {
  const input = toCreateAddressInput(draft);
  return {
    receiverName: input.receiverName,
    phone: input.phone,
    addressLine: input.addressLine,
    wardCode: input.wardCode,
    wardName: input.wardName,
    provinceCode: input.provinceCode,
    provinceName: input.provinceName,
    note: input.note,
  };
}

export function AddressForm({
  draft,
  isEditing,
  pending,
  error,
  onChange,
  onSubmit,
}: {
  draft: AddressDraft;
  isEditing: boolean;
  pending: boolean;
  error: string | null;
  onChange(draft: AddressDraft): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}) {
  const field = (key: keyof AddressDraft, value: string | boolean) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <form noValidate onSubmit={onSubmit}>
      <fieldset className="grid gap-5 sm:grid-cols-2" disabled={pending}>
        <label className="text-sm font-semibold">
          Tên người nhận
          <Input
            className="mt-2"
            autoComplete="name"
            maxLength={150}
            required
            value={draft.receiverName}
            onChange={(event) => field("receiverName", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Số điện thoại
          <Input
            className="mt-2"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            required
            value={draft.phone}
            onChange={(event) => field("phone", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Địa chỉ chi tiết
          <Input
            className="mt-2"
            autoComplete="street-address"
            maxLength={255}
            required
            value={draft.addressLine}
            onChange={(event) => field("addressLine", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Mã phường/xã
          <Input
            className="mt-2"
            maxLength={50}
            required
            value={draft.wardCode}
            onChange={(event) => field("wardCode", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Phường/xã
          <Input
            className="mt-2"
            maxLength={120}
            required
            value={draft.wardName}
            onChange={(event) => field("wardName", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Mã tỉnh/thành
          <Input
            className="mt-2"
            maxLength={50}
            required
            value={draft.provinceCode}
            onChange={(event) => field("provinceCode", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Tỉnh/thành
          <Input
            className="mt-2"
            maxLength={120}
            required
            value={draft.provinceName}
            onChange={(event) => field("provinceName", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Ghi chú
          <Input
            className="mt-2"
            maxLength={255}
            value={draft.note}
            onChange={(event) => field("note", event.target.value)}
          />
        </label>
        {!isEditing ? (
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
            <input
              className="size-4 accent-[var(--color-brand)]"
              type="checkbox"
              checked={draft.isDefault}
              onChange={(event) => field("isDefault", event.target.checked)}
            />
            Đặt làm địa chỉ mặc định
          </label>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="text-sm font-medium text-red-700 sm:col-span-2"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" className="sm:col-span-2 sm:w-fit">
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {pending ? "Đang lưu…" : "Lưu địa chỉ"}
        </Button>
      </fieldset>
    </form>
  );
}
