import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  Address,
  CreateAddressInput,
  UpdateAddressInput,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getAddresses(request: AuthorizedRequest): Promise<Address[]> {
  return request<Address[]>("/api/v1/me/addresses");
}

export function createAddress(
  request: AuthorizedRequest,
  input: CreateAddressInput,
): Promise<Address> {
  return request<Address>("/api/v1/me/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAddress(
  request: AuthorizedRequest,
  addressId: string,
  input: UpdateAddressInput,
): Promise<Address> {
  return request<Address>(`/api/v1/me/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setDefaultAddress(
  request: AuthorizedRequest,
  addressId: string,
): Promise<Address> {
  return request<Address>(`/api/v1/me/addresses/${addressId}/default`, {
    method: "PATCH",
  });
}

export function deleteAddress(
  request: AuthorizedRequest,
  addressId: string,
): Promise<void> {
  return request<void>(`/api/v1/me/addresses/${addressId}`, {
    method: "DELETE",
  });
}
