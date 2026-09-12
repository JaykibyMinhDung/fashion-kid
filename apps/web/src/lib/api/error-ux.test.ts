import { describe, expect, it } from "vitest";
import { ApiClientError } from "./api-client";
import { apiErrorMessage, orderActionErrorMessage } from "./error-ux";

describe("error UX map", () => {
  it("maps paid-order cancellation to a refund-specific message", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(409, "PAID_ORDER_CANNOT_CANCEL", "server detail"),
      ),
    ).toContain("đã thanh toán không thể huỷ");
  });

  it("maps invalid order transitions and keeps the conflict fallback", () => {
    expect(
      orderActionErrorMessage(
        new ApiClientError(409, "INVALID_ORDER_TRANSITION", "server detail"),
      ),
    ).toContain("Trạng thái đơn hàng đã thay đổi");
    expect(
      orderActionErrorMessage(new ApiClientError(409, "HTTP_ERROR", "")),
    ).toContain("Trạng thái đơn hàng đã thay đổi");
  });
});
