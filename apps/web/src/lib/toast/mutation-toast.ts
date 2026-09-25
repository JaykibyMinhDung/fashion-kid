import { toast } from "sonner";

import { apiErrorMessage, orderActionErrorMessage } from "@/lib/api/error-ux";

/**
 * Toast phản hồi cho các thao tác ghi dữ liệu (POST/PUT/PATCH/DELETE).
 *
 * Mọi request đã đăng nhập đều đi qua `authorizedRequest` của AuthProvider, nơi gọi
 * `resolveMutationToast` để hiện toast thành công/thất bại. Muốn đổi câu thông báo
 * của một thao tác: sửa bảng `RULES` bên dưới. Thao tác chưa có trong bảng vẫn có
 * toast với câu mặc định theo phương thức HTTP.
 */

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

type MutationToastRule = {
  method: MutationMethod;
  /** Đường dẫn API (không kèm query string); `:id` khớp một phân đoạn bất kỳ. */
  path: string;
  /** Câu báo thành công; `null` = không báo khi thành công (vẫn báo khi lỗi). */
  success: string | null;
  /** `true` = không hiện toast nào (tác vụ nền / tính toán, giao diện tự xử lý). */
  silent?: boolean;
  /** `true` = lỗi dùng thông điệp nghiệp vụ đơn hàng (409: trạng thái đã thay đổi). */
  orderAction?: boolean;
};

const RULES: MutationToastRule[] = [
  // Tác vụ nền: không làm phiền người dùng
  { method: "POST", path: "/auth/refresh", success: null, silent: true },
  { method: "POST", path: "/shipping/quote", success: null, silent: true },

  // Giỏ hàng & thanh toán
  { method: "POST", path: "/cart/items", success: "Đã thêm vào giỏ hàng" },
  // Bấm +/- liên tục trong giỏ: chỉ báo khi lỗi để tránh spam toast
  { method: "PATCH", path: "/cart/items/:id", success: null },
  { method: "DELETE", path: "/cart/items/:id", success: "Đã xoá sản phẩm khỏi giỏ hàng" },
  { method: "DELETE", path: "/cart", success: "Đã xoá toàn bộ giỏ hàng" },
  { method: "POST", path: "/coupons/validate", success: "Đã áp dụng mã giảm giá" },
  { method: "POST", path: "/checkout/orders", success: "Đặt hàng thành công" },
  // Thành công thì chuyển thẳng sang cổng VNPay, không cần toast
  { method: "POST", path: "/payments/:id/vnpay/create-url", success: null },

  // Tài khoản khách hàng
  { method: "PATCH", path: "/me", success: "Đã lưu thông tin cá nhân" },
  { method: "POST", path: "/me/avatar", success: "Đã cập nhật ảnh đại diện" },
  { method: "POST", path: "/me/addresses", success: "Đã thêm địa chỉ mới" },
  { method: "PATCH", path: "/me/addresses/:id/default", success: "Đã đặt làm địa chỉ mặc định" },
  { method: "PATCH", path: "/me/addresses/:id", success: "Đã cập nhật địa chỉ" },
  { method: "DELETE", path: "/me/addresses/:id", success: "Đã xoá địa chỉ" },
  { method: "POST", path: "/wishlist", success: "Đã thêm vào danh sách yêu thích" },
  { method: "DELETE", path: "/wishlist/:id", success: "Đã xoá khỏi danh sách yêu thích" },
  { method: "POST", path: "/reviews", success: "Đã gửi đánh giá" },
  { method: "PATCH", path: "/reviews/:id", success: "Đã cập nhật đánh giá" },
  { method: "POST", path: "/orders/:id/cancel", success: "Đã huỷ đơn hàng", orderAction: true },

  // Vận hành đơn hàng (sales / kho)
  { method: "POST", path: "/operational/orders/:id/confirm", success: "Đã xác nhận đơn hàng", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/cancel", success: "Đã huỷ đơn hàng", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/start-packing", success: "Đã chuyển đơn sang đóng gói", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/ship", success: "Đã chuyển đơn sang đang giao", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/deliver", success: "Đã xác nhận giao hàng thành công", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/complete", success: "Đã hoàn tất đơn hàng", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/shipping/create", success: "Đã tạo vận đơn GHN", orderAction: true },
  { method: "POST", path: "/operational/orders/:id/shipping/sync", success: "Đã đồng bộ trạng thái vận chuyển", orderAction: true },

  // Quản trị: sản phẩm & danh mục
  { method: "POST", path: "/admin/catalog/products", success: "Đã tạo sản phẩm" },
  { method: "PATCH", path: "/admin/catalog/products/:id/status", success: "Đã cập nhật trạng thái sản phẩm" },
  { method: "PATCH", path: "/admin/catalog/products/:id", success: "Đã lưu sản phẩm" },
  { method: "POST", path: "/admin/catalog/products/:id/variants", success: "Đã thêm biến thể" },
  { method: "PATCH", path: "/admin/catalog/variants/:id/status", success: "Đã cập nhật trạng thái biến thể" },
  { method: "PATCH", path: "/admin/catalog/variants/:id", success: "Đã lưu biến thể" },
  { method: "POST", path: "/admin/catalog/products/:id/images", success: "Đã thêm ảnh sản phẩm" },
  { method: "PATCH", path: "/admin/catalog/images/:id", success: "Đã cập nhật ảnh sản phẩm" },
  { method: "DELETE", path: "/admin/catalog/images/:id", success: "Đã xoá ảnh sản phẩm" },
  { method: "POST", path: "/admin/catalog/categories", success: "Đã tạo danh mục" },
  { method: "PATCH", path: "/admin/catalog/categories/:id/status", success: "Đã cập nhật trạng thái danh mục" },
  { method: "PATCH", path: "/admin/catalog/categories/:id", success: "Đã lưu danh mục" },

  // Quản trị: kho, người dùng, khuyến mãi, đánh giá
  { method: "POST", path: "/admin/inventory/import", success: "Đã nhập kho" },
  { method: "POST", path: "/admin/inventory/:id/adjust", success: "Đã điều chỉnh tồn kho" },
  { method: "PATCH", path: "/admin/users/:id/status", success: "Đã cập nhật trạng thái tài khoản" },
  { method: "PATCH", path: "/admin/users/:id/role", success: "Đã cập nhật vai trò người dùng" },
  { method: "POST", path: "/admin/coupons", success: "Đã tạo mã giảm giá" },
  { method: "PATCH", path: "/admin/coupons/:id/status", success: "Đã cập nhật trạng thái mã giảm giá" },
  { method: "PATCH", path: "/admin/coupons/:id", success: "Đã lưu mã giảm giá" },
  { method: "PATCH", path: "/admin/reviews/:id/status", success: "Đã cập nhật trạng thái đánh giá" },
];

const DEFAULT_SUCCESS: Record<MutationMethod, string> = {
  POST: "Thao tác thành công",
  PUT: "Đã lưu thay đổi",
  PATCH: "Đã lưu thay đổi",
  DELETE: "Đã xoá thành công",
};

export const DEFAULT_ERROR_MESSAGE = "Thao tác không thành công. Vui lòng thử lại.";

const MUTATION_METHODS = new Set<string>(["POST", "PUT", "PATCH", "DELETE"]);

function toPattern(path: string): RegExp {
  const escaped = path
    .split(":id")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]+");
  return new RegExp(`^/api/v1${escaped}$`);
}

const COMPILED_RULES = RULES.map((rule) => ({ ...rule, pattern: toPattern(rule.path) }));

/** Bỏ query string và dấu `/` ở cuối để so khớp với bảng RULES. */
export function normalizeApiPath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
}

export type MutationToastPlan = {
  /** Câu báo thành công, hoặc `null` nếu không báo khi thành công. */
  success: string | null;
  errorMessage(error: unknown): string;
};

/**
 * Trả về cách hiện toast cho một request, hoặc `null` nếu không hiện toast nào
 * (request đọc dữ liệu GET, hoặc tác vụ nền được đánh dấu `silent`).
 */
export function resolveMutationToast(
  method: string | undefined,
  path: string,
): MutationToastPlan | null {
  const normalizedMethod = (method ?? "GET").toUpperCase();
  if (!MUTATION_METHODS.has(normalizedMethod)) {
    return null;
  }

  const normalizedPath = normalizeApiPath(path);
  const rule = COMPILED_RULES.find(
    (candidate) =>
      candidate.method === normalizedMethod && candidate.pattern.test(normalizedPath),
  );
  if (rule?.silent) {
    return null;
  }

  return {
    success: rule ? rule.success : DEFAULT_SUCCESS[normalizedMethod as MutationMethod],
    errorMessage: rule?.orderAction
      ? orderActionErrorMessage
      : (error) => apiErrorMessage(error, DEFAULT_ERROR_MESSAGE),
  };
}

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(message: string): void {
  toast.error(message);
}

/**
 * Chạy một thao tác và hiện toast thành công/thất bại. Dùng cho các luồng không đi
 * qua `authorizedRequest` (đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác thực email).
 * Lỗi vẫn được ném lại để form hiển thị lỗi chi tiết như trước.
 */
export async function withToast<T>(
  action: Promise<T>,
  messages: { success: string; error?: string },
): Promise<T> {
  try {
    const result = await action;
    notifySuccess(messages.success);
    return result;
  } catch (error) {
    notifyError(apiErrorMessage(error, messages.error ?? DEFAULT_ERROR_MESSAGE));
    throw error;
  }
}
