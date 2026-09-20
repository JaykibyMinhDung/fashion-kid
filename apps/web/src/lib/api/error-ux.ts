import { ApiClientError, type ClientErrorCode } from "./api-client";

const ERROR_CODE_UX_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  // --- Order ---
  PAID_ORDER_CANNOT_CANCEL:
    "Đơn hàng đã thanh toán không thể huỷ. Vui lòng liên hệ hỗ trợ để xử lý hoàn tiền.",
  INVALID_ORDER_TRANSITION:
    "Trạng thái đơn hàng đã thay đổi hoặc thao tác không còn hợp lệ. Dữ liệu sẽ được làm mới.",
  ORDER_TRANSITION_CONFLICT:
    "Đơn hàng vừa được xử lý bởi nhân viên khác. Dữ liệu sẽ được làm mới.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  STOCK_RESERVATION_INCONSISTENT:
    "Dữ liệu tồn kho không nhất quán. Vui lòng liên hệ quản trị viên.",

  // --- Cart ---
  CART_CONFLICT:
    "Giỏ hàng vừa thay đổi ở nơi khác. Vui lòng tải lại giỏ hàng trước khi tiếp tục.",
  CART_EMPTY: "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi tiếp tục.",
  CART_ITEM_NOT_FOUND: "Sản phẩm không còn trong giỏ hàng.",
  CART_QUANTITY_INVALID: "Số lượng sản phẩm không hợp lệ.",
  CART_QUANTITY_LIMIT_EXCEEDED: "Số lượng sản phẩm vượt quá giới hạn cho phép.",

  // --- Inventory / Stock ---
  OUT_OF_STOCK: "Sản phẩm đã hết hàng.",
  INSUFFICIENT_AVAILABLE_STOCK:
    "Không đủ hàng tồn kho để thực hiện đơn hàng.",
  VARIANT_NOT_SELLABLE: "Phiên bản sản phẩm này hiện không được bán.",
  VARIANT_NOT_FOUND: "Không tìm thấy phiên bản sản phẩm.",

  // --- Shipping ---
  SHIPPING_QUOTE_STALE:
    "Báo giá vận chuyển đã hết hạn. Vui lòng kiểm tra lại phí giao hàng rồi thử lại.",
  SHIPPING_PROVIDER_UNAVAILABLE:
    "Dịch vụ vận chuyển tạm thời không khả dụng. Vui lòng thử lại sau.",
  SHIPMENT_NOT_READY: "Đơn hàng chưa sẵn sàng để giao.",

  // --- Coupon ---
  COUPON_EXPIRED: "Mã giảm giá đã hết hạn.",
  COUPON_NOT_FOUND: "Mã giảm giá không tồn tại.",
  COUPON_DISABLED: "Mã giảm giá đã bị vô hiệu hoá.",
  COUPON_NOT_STARTED: "Mã giảm giá chưa bắt đầu hiệu lực.",
  COUPON_MIN_ORDER_NOT_MET:
    "Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng mã giảm giá.",
  COUPON_USAGE_LIMIT_REACHED: "Mã giảm giá đã hết lượt sử dụng.",
  COUPON_USER_LIMIT_REACHED:
    "Bạn đã sử dụng mã giảm giá này đủ số lần cho phép.",
  COUPON_INVALID: "Mã giảm giá không hợp lệ.",

  // --- Review ---
  REVIEW_NOT_ELIGIBLE:
    "Bạn không đủ điều kiện để đánh giá sản phẩm này (cần có đơn hàng hoàn tất).",
  REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá sản phẩm này rồi.",

  // --- Payment ---
  PAYMENT_EXPIRED: "Phiên thanh toán đã hết hạn. Vui lòng thử lại.",
  VNPAY_PAYMENT_ALREADY_COMPLETED: "Giao dịch thanh toán đã được xử lý.",

  // --- Auth / Session ---
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác.",
  INVALID_SESSION: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  USER_DISABLED: "Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.",

  // --- Password Reset ---
  PASSWORD_RESET_TOKEN_EXPIRED:
    "Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu lại.",
  PASSWORD_RESET_OTP_INVALID: "Mã OTP không chính xác.",
  PASSWORD_RESET_TOO_MANY_ATTEMPTS:
    "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",

  // --- Email ---
  EMAIL_NOT_VERIFIED:
    "Email chưa được xác minh. Vui lòng kiểm tra hộp thư và xác minh email.",
  EMAIL_ALREADY_VERIFIED: "Email đã được xác minh trước đó.",

  // --- Generic ---
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  RATE_LIMITED: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
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
