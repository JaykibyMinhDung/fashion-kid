"use client";

import { LoaderCircle, MapPin, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type {
  Address,
  CreateAddressInput,
  UpdateAddressInput,
} from "../contracts";
import {
  getMasterDistricts,
  getMasterProvinces,
  getMasterWards,
  type MasterDataDistrict,
  type MasterDataProvince,
  type MasterDataWard,
} from "../api/master-data-client";

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
      return `${label} là bắt buộc và không được vượt quá ${maximum} ký tự. Vui lòng chọn Tỉnh/Thành, Quận/Huyện và Phường/Xã từ danh mục.`;
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
  const [provinces, setProvinces] = useState<MasterDataProvince[]>([]);
  const [districts, setDistricts] = useState<MasterDataDistrict[]>([]);
  const [wards, setWards] = useState<MasterDataWard[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "">("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "">("");
  const [selectedWardCode, setSelectedWardCode] = useState<string>("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const field = (key: keyof AddressDraft, value: string | boolean) => {
    onChange({ ...draft, [key]: value });
  };

  // Load provinces on mount and auto-select matching province
  useEffect(() => {
    let active = true;
    setLoadingProvinces(true);
    getMasterProvinces()
      .then((data) => {
        if (!active) return;
        setProvinces(data);
        if (draft.provinceName || draft.provinceCode) {
          const matched = data.find(
            (p) =>
              p.code.toLowerCase() === draft.provinceCode.toLowerCase() ||
              p.name.toLowerCase() === draft.provinceName.toLowerCase() ||
              draft.provinceName.toLowerCase().includes(p.name.toLowerCase()),
          );
          if (matched) {
            setSelectedProvinceId(matched.id);
          }
        }
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load districts when selected province changes
  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      setSelectedDistrictId("");
      return;
    }
    let active = true;
    setLoadingDistricts(true);
    getMasterDistricts(selectedProvinceId)
      .then((data) => {
        if (!active) return;
        setDistricts(data);
        // Try to match district from addressLine if any
        if (draft.addressLine) {
          const matched = data.find((d) =>
            draft.addressLine.toLowerCase().includes(d.name.toLowerCase()),
          );
          if (matched) {
            setSelectedDistrictId(matched.id);
          }
        }
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProvinceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load wards when selected district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      setSelectedWardCode("");
      return;
    }
    let active = true;
    setLoadingWards(true);
    getMasterWards(selectedDistrictId)
      .then((data) => {
        if (!active) return;
        setWards(data);
        const matched = data.find(
          (w) =>
            w.code.toLowerCase() === draft.wardCode.toLowerCase() ||
            w.name.toLowerCase() === draft.wardName.toLowerCase(),
        );
        if (matched) {
          setSelectedWardCode(matched.code);
        }
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDistrictId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProvinceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value ? parseInt(e.target.value, 10) : "";
    setSelectedProvinceId(pId);
    setSelectedDistrictId("");
    setSelectedWardCode("");
    const prov = provinces.find((p) => p.id === pId);
    onChange({
      ...draft,
      provinceCode: prov ? prov.code : "",
      provinceName: prov ? prov.name : "",
      wardCode: "",
      wardName: "",
    });
  };

  const handleDistrictSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dId = e.target.value ? parseInt(e.target.value, 10) : "";
    setSelectedDistrictId(dId);
    setSelectedWardCode("");
    onChange({
      ...draft,
      wardCode: "",
      wardName: "",
    });
  };

  const handleWardSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wCode = e.target.value;
    setSelectedWardCode(wCode);
    const ward = wards.find((w) => w.code === wCode);
    onChange({
      ...draft,
      wardCode: wCode,
      wardName: ward ? ward.name : "",
    });
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

        {/* 3 Cascaded Dropdowns for Province, District, Ward */}
        <div className="rounded-2xl border border-brand/20 bg-[#faf6f1] p-4 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-strong">
            <MapPin className="size-4" />
            <span>Chọn khu vực nhận hàng (Tỉnh / Huyện / Xã)</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <span className="block text-xs font-semibold text-foreground">
                Tỉnh / Thành phố
              </span>
              <Select
                className="mt-1 bg-white font-medium"
                value={selectedProvinceId}
                onChange={handleProvinceSelect}
              >
                <option value="">
                  {loadingProvinces ? "Đang tải tỉnh/thành…" : "— Chọn Tỉnh/Thành —"}
                </option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-foreground">
                Quận / Huyện
              </span>
              <Select
                className="mt-1 bg-white font-medium"
                disabled={!selectedProvinceId}
                value={selectedDistrictId}
                onChange={handleDistrictSelect}
              >
                <option value="">
                  {!selectedProvinceId
                    ? "Chọn tỉnh/thành trước"
                    : loadingDistricts
                      ? "Đang tải quận/huyện…"
                      : "— Chọn Quận/Huyện —"}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-foreground">
                Phường / Xã
              </span>
              <Select
                className="mt-1 bg-white font-medium"
                disabled={!selectedDistrictId}
                value={selectedWardCode}
                onChange={handleWardSelect}
              >
                <option value="">
                  {!selectedDistrictId
                    ? "Chọn quận/huyện trước"
                    : loadingWards
                      ? "Đang tải phường/xã…"
                      : "— Chọn Phường/Xã —"}
                </option>
                {wards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {draft.wardName && draft.provinceName ? (
            <p className="mt-2 text-xs font-semibold text-sage">
              ✓ Đã chọn: {draft.wardName}, {draft.provinceName} (Mã GHN: {draft.wardCode})
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Vui lòng chọn lần lượt Tỉnh/Thành, Quận/Huyện và Phường/Xã để đơn hàng được giao chính xác.
            </p>
          )}
        </div>

        <label className="text-sm font-semibold sm:col-span-2">
          Địa chỉ chi tiết
          <Input
            className="mt-2"
            autoComplete="street-address"
            maxLength={255}
            required
            placeholder="Số nhà, ngõ ngách, tên đường..."
            value={draft.addressLine}
            onChange={(event) => field("addressLine", event.target.value)}
          />
        </label>

        {/* Underlying administrative fields (automatically populated by dropdowns, customizable if needed) */}
        <label className="text-sm font-semibold">
          Phường/xã
          <Input
            className="mt-2"
            maxLength={120}
            required
            placeholder="Tự động điền theo lựa chọn ở trên"
            value={draft.wardName}
            onChange={(event) => field("wardName", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Mã phường/xã
          <Input
            className="mt-2"
            maxLength={50}
            required
            placeholder="Mã phường GHN"
            value={draft.wardCode}
            onChange={(event) => field("wardCode", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Tỉnh/thành
          <Input
            className="mt-2"
            maxLength={120}
            required
            placeholder="Tự động điền theo lựa chọn ở trên"
            value={draft.provinceName}
            onChange={(event) => field("provinceName", event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Mã tỉnh/thành
          <Input
            className="mt-2"
            maxLength={50}
            required
            placeholder="Mã tỉnh GHN"
            value={draft.provinceCode}
            onChange={(event) => field("provinceCode", event.target.value)}
          />
        </label>

        <label className="text-sm font-semibold sm:col-span-2">
          Ghi chú
          <Input
            className="mt-2"
            maxLength={255}
            placeholder="Lời dặn cho shipper (nếu có)..."
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
