# Kids Fashion Web

Frontend Next.js của hệ thống Kids Fashion, chạy mặc định tại `http://localhost:3000`.

## Cấu hình API và Auth

Sao chép `apps/web/.env.example` thành `apps/web/.env.local` và đặt:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Giá trị phải là HTTP(S) origin chính xác, không có path hoặc dấu `/` cuối. Đây là biến public được đóng vào bundle; không đặt JWT secret, credential hoặc dữ liệu nhạy cảm trong bất kỳ biến `NEXT_PUBLIC_*` nào.

Web gọi trực tiếp Nest API với cookie credentials. Access token chỉ nằm trong closure memory của auth client; refresh cookie do trình duyệt quản lý dưới cờ `HttpOnly`. Provider bootstrap session bằng refresh khi reload, chỉ retry một lần sau response 401 và dùng Web Locks khi khả dụng để giảm refresh race giữa các tab. Không lưu token vào `localStorage` hoặc `sessionStorage`.

Các portal được điều hướng theo role nhưng `RoleGate` chỉ chống flash nội dung và cải thiện UX. Backend guard vẫn là ranh giới authorization bắt buộc. Trang `/account/profile` đã dùng `GET/PATCH /api/v1/me`; sau khi cập nhật thành công, dữ liệu user trong auth provider cũng được đồng bộ để header không giữ tên cũ.

Trang `/account/addresses` đã kết nối đủ API list/create/edit/delete/set-default. Form giữ canonical Province + Ward code/name theo contract backend; không gửi `userId` hoặc `isDefault` trong update thông thường. Các mutation refetch danh sách sau khi thành công để UI lấy default state từ backend thay vì tự suy luận authority.

Trang `/admin/users` đã kết nối các endpoint quản trị người dùng bằng typed client. Bảng hỗ trợ search theo email/họ tên/số điện thoại, filter role/status, sort, pagination, loading/error/retry và mutation đổi status/role có xác nhận, pending lock, self-mutation guard và refetch sau thành công. Backend vẫn là authority cho permission, conflict và audit.

Storefront `/products` và `/products/[slug]` đã dùng Catalog API typed thay cho mock: filter category/brand/size/color, sort, loading/error/empty state, variant color/size và giá decimal string. Admin `/admin/products` đã nối Product/Variant/Image API bằng typed client, gồm activation, SKU immutable, primary-image flow và các trạng thái loading/error/empty. Homepage và `/admin/categories` vẫn là placeholder/mock có chủ đích cho các lát UI tiếp theo.

Ảnh do Catalog API trả về được render qua `components/shared/safe-image.tsx`: ảnh local vẫn dùng tối ưu của `next/image`, còn URL ngoài dùng `unoptimized` và tự fallback về ảnh catalog local nếu host không truy cập được. Không dùng wildcard remote host trong `next.config.ts`.

Các form nhập liệu Auth và huỷ đơn dùng React Hook Form + Zod, không đọc field bằng `new FormData` hoặc giữ state field thủ công. API client dùng chung nằm tại `src/lib/api/`; `src/lib/api/error-ux.ts` là bản đồ tập trung từ error code sang thông báo UX, gồm `PAID_ORDER_CANNOT_CANCEL`, `INVALID_ORDER_TRANSITION`, `SHIPPING_QUOTE_STALE` và các lỗi conflict chính.

Admin `/admin/inventory` và Warehouse `/warehouse/inventory` đã dùng Inventory API thật tại `MAIN_WAREHOUSE`: list theo SKU/Product, import, target adjustment và history phân trang/lọc. `reserved` chỉ đọc; UI không có generic stock patch, không optimistic update và refetch snapshot sau mutation.

Customer `/cart` đã dùng Cart API thật với RoleGate authenticated: lazy snapshot, quantity +/- bounded, remove/clear có xác nhận, current-price/line subtotal và warning stale/out-of-stock/variant disabled. Product detail có Add-to-Cart theo Variant; Cart không hiển thị trạng thái “đã giữ hàng”.

`/checkout` đã kết nối address → signed shipping quote → COD submit. Frontend gửi fingerprint thay vì phí tự tính; khi backend trả `SHIPPING_QUOTE_STALE`, UI lấy quote mới và yêu cầu người dùng submit lại. Customer order list/detail/success và các màn hình Sales/Warehouse/Admin đã dùng Order API thật, chỉ hiển thị mutation theo `allowedActions` của backend và refetch sau conflict.

## Chạy và kiểm tra

Từ thư mục gốc monorepo:

```powershell
pnpm dev:web
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

Admin Catalog, Inventory, Cart, Checkout và Order operations UI đã nối các mutation contract. Hợp đồng tiền tệ giữ decimal string xuyên suốt; phần tổng tiền Checkout dùng `BigInt` cho hiển thị tạm thời nhưng server/database vẫn là authority.

Web dùng system font cục bộ nên production build không phụ thuộc tải font từ mạng. Mọi thay đổi UI phải vượt qua lint, typecheck, test và production build trước khi merge.
