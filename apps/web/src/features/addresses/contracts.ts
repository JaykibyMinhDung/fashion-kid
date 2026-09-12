export type Address = {
  id: string;
  receiverName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
  note: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAddressInput = {
  receiverName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
  note?: string | null;
  isDefault?: boolean;
};

export type UpdateAddressInput = Omit<CreateAddressInput, "isDefault">;
