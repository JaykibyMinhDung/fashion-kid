import { ApiClientError, type ClientErrorCode } from "./api-client";

const ERROR_CODE_UX_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  PAID_ORDER_CANNOT_CANCEL:
    "Đơn hàng đã thanh toán không thể huỷ. Vui lòng liên hệ hỗ trợ để xử lý hoàn tiền.",
  INVALID_ORDER_TRANSITION:
    "Trạng thái đơn hàng đã thay đổi hoặc thao tác không còn hợp lệ. Dữ liệu sẽ được làm mới.",
  SHIPPING_QUOTE_STALE:
    "Báo giá vận chuyển đã hết hạn. Vui lòng kiểm tra lại phí giao hàng rồi thử lại.",
  CART_CONFLICT:
    "Giỏ hàng vừa thay đổi ở nơi khác. Vui lòng tải lại giỏ hàng trước khi tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  SERVICE_UNAVAILABLE: "Dịch vụ đang tạm thời gián đoạn. Vui lòng thử lại sau.",
};

export function apiErrorMessage(
  error: unknown,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại.",
): string {
  if (!(error instanceof ApiClientError)) {
    return fallback;
  }

  return (ERROR_CODE_UX_MESSAGES[error.code] ?? error.message) || fallback;
}

export function orderActionErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 409) {
    return apiErrorMessage(
      error,
      "Trạng thái đơn hàng đã thay đổi hoặc thao tác không còn hợp lệ. Dữ liệu sẽ được làm mới.",
    );
  }

  return apiErrorMessage(error, "Không thể thực hiện thao tác đơn hàng lúc này.");
}
