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

  it("maps ORDER_TRANSITION_CONFLICT to a staff-collision message", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(409, "ORDER_TRANSITION_CONFLICT", "server detail"),
      ),
    ).toContain("nhân viên khác");
  });

  it("maps ORDER_NOT_FOUND", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(404, "ORDER_NOT_FOUND", "server detail"),
      ),
    ).toContain("Không tìm thấy đơn hàng");
  });

  it("maps stock and inventory codes", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(500, "STOCK_RESERVATION_INCONSISTENT", "server"),
      ),
    ).toContain("tồn kho không nhất quán");
    expect(
      apiErrorMessage(new ApiClientError(409, "OUT_OF_STOCK", "server")),
    ).toContain("hết hàng");
    expect(
      apiErrorMessage(
        new ApiClientError(409, "INSUFFICIENT_AVAILABLE_STOCK", "server"),
      ),
    ).toContain("Không đủ hàng");
  });

  it("maps coupon codes", () => {
    expect(
      apiErrorMessage(new ApiClientError(400, "COUPON_EXPIRED", "server")),
    ).toContain("hết hạn");
    expect(
      apiErrorMessage(
        new ApiClientError(400, "COUPON_USAGE_LIMIT_REACHED", "server"),
      ),
    ).toContain("hết lượt sử dụng");
    expect(
      apiErrorMessage(
        new ApiClientError(400, "COUPON_USER_LIMIT_REACHED", "server"),
      ),
    ).toContain("đủ số lần");
    expect(
      apiErrorMessage(
        new ApiClientError(400, "COUPON_MIN_ORDER_NOT_MET", "server"),
      ),
    ).toContain("tối thiểu");
  });

  it("maps review codes", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(403, "REVIEW_NOT_ELIGIBLE", "server"),
      ),
    ).toContain("không đủ điều kiện");
    expect(
      apiErrorMessage(
        new ApiClientError(409, "REVIEW_ALREADY_EXISTS", "server"),
      ),
    ).toContain("đã đánh giá");
  });

  it("maps auth and session codes", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(401, "INVALID_CREDENTIALS", "server"),
      ),
    ).toContain("Email hoặc mật khẩu");
    expect(
      apiErrorMessage(new ApiClientError(401, "INVALID_SESSION", "server")),
    ).toContain("hết hạn");
    expect(
      apiErrorMessage(new ApiClientError(403, "USER_DISABLED", "server")),
    ).toContain("vô hiệu hoá");
  });

  it("falls back to server message for unmapped codes", () => {
    expect(
      apiErrorMessage(
        new ApiClientError(500, "INTERNAL_ERROR", "Something broke"),
      ),
    ).toBe("Something broke");
  });

  it("falls back to default when error is not ApiClientError", () => {
    expect(apiErrorMessage(new Error("random"))).toBe(
      "Đã xảy ra lỗi. Vui lòng thử lại.",
    );
  });

  it("orderActionErrorMessage uses order-specific fallback for non-409", () => {
    expect(
      orderActionErrorMessage(
        new ApiClientError(500, "INTERNAL_ERROR", ""),
      ),
    ).toContain("Không thể thực hiện thao tác đơn hàng");
  });
});
