import { describe, expect, it } from "vitest";

import { ApiClientError } from "@/lib/api/api-client";

import {
  DEFAULT_ERROR_MESSAGE,
  normalizeApiPath,
  resolveMutationToast,
} from "./mutation-toast";

describe("resolveMutationToast", () => {
  it("does not toast read requests", () => {
    expect(resolveMutationToast(undefined, "/api/v1/admin/catalog/products")).toBeNull();
    expect(resolveMutationToast("GET", "/api/v1/me")).toBeNull();
  });

  it("uses the specific message for a known endpoint (ids and query ignored)", () => {
    expect(
      resolveMutationToast("PATCH", "/api/v1/admin/catalog/products/abc-123?x=1")?.success,
    ).toBe("Đã lưu sản phẩm");
    expect(
      resolveMutationToast("patch", "/api/v1/admin/catalog/products/abc-123/status")?.success,
    ).toBe("Đã cập nhật trạng thái sản phẩm");
    expect(resolveMutationToast("POST", "/api/v1/wishlist/")?.success).toBe(
      "Đã thêm vào danh sách yêu thích",
    );
  });

  it("stays silent for background requests", () => {
    expect(resolveMutationToast("POST", "/api/v1/auth/refresh")).toBeNull();
    expect(resolveMutationToast("POST", "/api/v1/shipping/quote")).toBeNull();
  });

  it("only reports errors for cart quantity changes", () => {
    const plan = resolveMutationToast("PATCH", "/api/v1/cart/items/item-1");
    expect(plan).not.toBeNull();
    expect(plan?.success).toBeNull();
  });

  it("falls back to a generic message for unknown mutations", () => {
    expect(resolveMutationToast("POST", "/api/v1/something/new")?.success).toBe(
      "Thao tác thành công",
    );
    expect(resolveMutationToast("DELETE", "/api/v1/something/1")?.success).toBe(
      "Đã xoá thành công",
    );
  });

  it("maps API errors to the user-facing message", () => {
    const plan = resolveMutationToast("POST", "/api/v1/admin/coupons");
    expect(plan?.errorMessage(new Error("network down"))).toBe(DEFAULT_ERROR_MESSAGE);
    expect(
      plan?.errorMessage(new ApiClientError(400, "VALIDATION_ERROR", "Mã giảm giá đã tồn tại")),
    ).toBeTruthy();
  });
});

describe("normalizeApiPath", () => {
  it("strips query strings and trailing slashes", () => {
    expect(normalizeApiPath("/api/v1/wishlist/?a=1")).toBe("/api/v1/wishlist");
    expect(normalizeApiPath("/")).toBe("/");
  });
});
