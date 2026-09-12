# Kids Fashion API

Backend NestJS của hệ thống Kids Fashion. Database layer dùng Prisma 7, PostgreSQL 17 và driver adapter `pg`.

## Cấu hình

Sao chép `apps/api/.env.example` thành `apps/api/.env`. Các biến bắt buộc:

- `DATABASE_URL`: PostgreSQL connection string.
- `DEMO_PASSWORD`: mật khẩu dùng để băm tài khoản seed, không ghi mật khẩu thật vào source.
- `PORT`: cổng API, mặc định `8080`.
- `WEB_ORIGIN`: origin web duy nhất được CORS cho phép, không kèm path hoặc dấu `/` cuối.
- `JWT_ACCESS_SECRET`: secret ngẫu nhiên tối thiểu 32 byte; phải khác nhau giữa các môi trường.
- `JWT_ISSUER`, `JWT_AUDIENCE`: issuer/audience bắt buộc khi ký và xác minh access token.
- `ACCESS_TOKEN_TTL_SECONDS`: TTL access token, mặc định đặc tả là `900` giây.
- `REFRESH_TOKEN_TTL_HOURS`, `REMEMBER_REFRESH_TOKEN_TTL_DAYS`, `REMEMBER_REFRESH_INACTIVITY_DAYS`: giới hạn session refresh thường và remember-me.
- `MAX_CART_ITEM_QTY`: giới hạn số lượng mỗi Product Variant trong Cart, mặc định đặc tả local là `99`.
- `SHIPPING_FALLBACK_FEE`: phí fallback VND dạng decimal string không âm, local mặc định `30000`.
- `SHIPPING_QUOTE_TTL_SECONDS`: TTL của signed quote, từ 60 đến 1800 giây, local mặc định `300`.
- `COOKIE_SECURE`: đặt `false` duy nhất cho HTTP local; production HTTPS phải đặt `true`.

Ứng dụng validate toàn bộ cấu hình và dừng sớm nếu biến bắt buộc thiếu, URL/origin sai hoặc TTL vượt giới hạn. Tạo secret local bằng lệnh sau rồi điền kết quả vào `apps/api/.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Không commit `apps/api/.env` hoặc dùng secret mẫu ở staging/production.

## Auth và session

- API cung cấp `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` và `POST /api/v1/auth/change-password`.
- Access token JWT có thời hạn ngắn, được trả trong JSON để web giữ trong memory. Refresh token opaque chỉ nằm trong cookie `HttpOnly`, `SameSite=Strict`, `Path=/` và được hash trong database; production dùng tiền tố `__Host-` và không đặt `Domain`.
- Refresh được rotate nguyên tử. Phát hiện replay sẽ thu hồi cả token family; logout/đổi mật khẩu tăng `auth_version` để access token cũ bị từ chối ngay, đồng thời thu hồi refresh session theo policy.
- Guard backend luôn tải lại role và trạng thái user từ database; capability guard đối chiếu permission từ role→permission map tập trung. `RoleGate` ở frontend chỉ phục vụ UX, không phải ranh giới phân quyền.
- Login/register/refresh/change-password có throttling. Khi chạy nhiều API instance, cần thay bộ đếm in-memory bằng shared throttler trước production.

## Hồ sơ người dùng

- `GET /api/v1/me` trả hồ sơ của access token hiện tại.
- `PATCH /api/v1/me` chỉ nhận `fullName`, `phone`, `avatarUrl`; email, role và status không được tự cập nhật.
- Cả hai endpoint dùng capability own-profile và luôn kiểm lại user `ACTIVE` từ database.

## Sổ địa chỉ

- `GET/POST /api/v1/me/addresses`, `PATCH/DELETE /api/v1/me/addresses/:id` và `PATCH /api/v1/me/addresses/:id/default` luôn lấy owner từ access token; client không được gửi `userId`.
- Address dùng canonical Province + Ward với cả code và name; không có district canonical theo đặc tả cuối Day 16.
- Mọi mutation scope đồng thời `id + userId`; UUID của user khác được trả 404 để chống resource enumeration.
- Transaction khóa row User trước khi create/update/set-default/delete. Địa chỉ đầu tiên tự thành default; đổi hoặc xóa default luôn kết thúc với đúng một default nếu danh sách còn phần tử. Partial unique index PostgreSQL là safety net cho giới hạn tối đa một default.

## Quản trị người dùng

- `GET /api/v1/admin/users` hỗ trợ phân trang mặc định `page=1`, `limit=20` (tối đa 100), tìm theo email/họ tên/số điện thoại, lọc role/status và sort theo allow-list.
- `GET /api/v1/admin/users/:id` trả projection an toàn gồm thông tin liên hệ, role, status, lần đăng nhập cuối và thời điểm tạo; không trả `passwordHash`, refresh token hoặc quan hệ nội bộ.
- `PATCH /api/v1/admin/users/:id/status` chỉ cho Admin có `USER_MANAGE_STATUS`; disable thu hồi mọi refresh session và ghi `USER_DISABLED`, enable ghi `USER_ENABLED`.
- `PATCH /api/v1/admin/users/:id/role` chỉ cho Admin có `USER_MANAGE_ROLE`; role phải thuộc `CUSTOMER`, `SALES_STAFF`, `WAREHOUSE_STAFF`, `ADMIN`, đồng thời thu hồi session và ghi `USER_ROLE_CHANGED`.
- Mọi mutation status/role dùng một transaction với khóa admin xác định để bảo vệ self-disable, self-role-change và last active admin; conflict trả HTTP 409.
- Error code ổn định cho luồng này gồm `USER_NOT_FOUND`, `INVALID_ROLE`, `USER_ALREADY_ACTIVE`, `USER_ALREADY_DISABLED`, `ROLE_UNCHANGED`, `CANNOT_DISABLE_SELF`, `CANNOT_MODIFY_SELF_ROLE` và `LAST_ADMIN_PROTECTION`.

## Public Catalog

- `GET /api/v1/products` hỗ trợ pagination (`page`, `limit`), tìm kiếm `q`, lọc category/brand/gender/ageGroup/size/color/minPrice/maxPrice và sort allow-list `newest`, `price_asc`, `price_desc`, `name_asc`.
- `GET /api/v1/products/:slug` chỉ trả sản phẩm public; Product hoặc Variant disabled, Category/Brand/Size/Color disabled, hoặc variant thiếu kích thước vận chuyển hợp lệ đều bị loại. Slug disabled/không tồn tại trả 404.
- `GET /api/v1/categories`, `/brands`, `/sizes`, `/colors` chỉ trả master data ACTIVE.
- Filter size và color được áp dụng trên cùng một ProductVariant; product card tính `minPrice`/`maxPrice` từ các variant ACTIVE hợp lệ. Mọi giá HTTP là decimal string, không dùng JavaScript number làm authority.
- Public projection không trả stock, dimensions, internal status của Product, secret hoặc quan hệ persistence; Inventory chỉ quyết định quantity ở các phase sau và không làm ẩn sản phẩm out-of-stock.

## Admin Catalog activation

- `PATCH /api/v1/admin/products/:id/status` và alias `/api/v1/admin/catalog/products/:id/status` yêu cầu `CATALOG_MANAGE`; disable luôn ghi audit và loại Product khỏi public read ngay lập tức.
- Chuyển sang `ACTIVE` chỉ thành công khi Category/Brand (nếu có) ACTIVE, có ít nhất một Variant ACTIVE, Size/Color ACTIVE, giá không âm, dimensions/weight dương và đúng một ảnh primary. Vi phạm trả `409 CATALOG_ACTIVATION_BLOCKED` trong khi Product vẫn DISABLED.
- Mọi status mutation khóa Product row trong transaction và ghi `PRODUCT_ACTIVATED` hoặc `PRODUCT_DISABLED`.

## Admin Catalog master data

- Các route `/api/v1/admin/catalog/categories`, `/brands`, `/sizes`, `/colors` hỗ trợ list (lọc `status`/`q`), create, update và đổi status; mọi route yêu cầu `CATALOG_MANAGE`.
- Category slug được chuẩn hóa lowercase và kiểm tra parent tồn tại/self-parent; Brand slug, Size/Color code được chuẩn hóa và unique. Create master mặc định `DISABLED` để không vô tình mở dữ liệu public.
- Update chỉ nhận field được khai báo trong DTO; unique/FK conflict trả `409 CATALOG_MASTER_CONFLICT`, không trả lỗi persistence thô. Hard delete không dùng cho master đang được tham chiếu; status là cơ chế vô hiệu hóa.

## Admin Product/Variant/Image CRUD

- Product list/detail: `GET /api/v1/admin/catalog/products` và `GET /api/v1/admin/catalog/products/:id`; create/update dùng projection admin có category/brand, số lượng ảnh/variant và trạng thái.
- Product create mặc định `DISABLED`; status không phải field CRUD mà dùng endpoint activation ở trên. Variant cũng mặc định `DISABLED`; `PATCH /api/v1/admin/catalog/variants/:id/status` kiểm tra price decimal string, kích thước dương và Size/Color ACTIVE trước khi ghi `VARIANT_ACTIVATED`/`VARIANT_DISABLED`.
- Variant create/update: `POST /api/v1/admin/catalog/products/:productId/variants`, `PATCH /api/v1/admin/catalog/variants/:id`. SKU được trim/uppercase khi tạo và cố ý không có trong DTO update để immutable; unique SKU và tổ hợp product/size/color map thành `409 CATALOG_MASTER_CONFLICT`.
- Image create/update/delete: `POST /api/v1/admin/catalog/products/:productId/images`, `PATCH /api/v1/admin/catalog/images/:id`, `DELETE /api/v1/admin/catalog/images/:id`. Primary flag được điều phối nguyên tử; xóa primary cuối cùng của Product ACTIVE trả `409 CATALOG_ACTIVATION_BLOCKED`.

## Admin Inventory

- `GET /api/v1/admin/inventory` trả tồn kho theo Product Variant tại kho đã chọn (mặc định `MAIN_WAREHOUSE`), gồm `onHand`, `reserved`, `available` và cả Variant chưa từng có dòng Inventory với giá trị 0.
- `GET /api/v1/admin/inventory/:variantId` trả snapshot tồn kho; `GET /api/v1/admin/inventory/history` và `GET /api/v1/admin/inventory/:variantId/history` trả ledger append-only, có phân trang/lọc theo `type`.
- `POST /api/v1/admin/inventory/import` chỉ tăng `onHand`, tự tạo dòng Inventory lần đầu và ghi một transaction `IMPORT`. `POST /api/v1/admin/inventory/:variantId/adjust` nhận `targetOnHand` cùng lý do, reject no-op và target nhỏ hơn `reserved`; không có generic stock patch.
- `INVENTORY_READ`, `INVENTORY_IMPORT`, `INVENTORY_ADJUST` tách theo capability; Customer không đọc/ghi được, Warehouse staff được cấp đúng quyền vận hành, Admin có đầy đủ quyền.
- Repository cung cấp primitive transaction dùng chung cho `reserveMany`, `releaseMany`, `saleMany`. Mỗi mutation khóa row, ghi before/after snapshot trong cùng transaction; `ADJUSTMENT` lưu delta có thể âm.

## Database schema

Schema hiện có 26 bảng nghiệp vụ:

- Danh tính: role, user, refresh token, address.
- Catalog: category, brand, product, image, size, color, variant.
- Kho: warehouse, inventory, inventory transaction.
- Bán hàng: cart, cart item, order, order item, order status history, daily order counter.
- Thanh toán: payment, payment transaction.
- P1: coupon, coupon usage, review, audit log.

Tiền tệ lưu bằng PostgreSQL `BIGINT`. Ở biên HTTP, mọi giá trị tiền phải là decimal string và dữ liệu `bigint` trả về được serialize thành chuỗi; không sử dụng JavaScript `number` cho tiền.

## Customer Cart

- `GET /api/v1/cart` lazy-create và trả Cart persistent của Customer hiện tại; Cart không nhận `userId`/`cartId` từ client.
- `POST /api/v1/cart/items` nhận `{ variantId, quantity }`; thêm lại cùng Variant được cộng atomic, quantity bị giới hạn bởi `MAX_CART_ITEM_QTY` và kiểm tra sellability/available nhẹ tại thời điểm thêm.
- `PATCH /api/v1/cart/items/:cartItemId`, `DELETE /api/v1/cart/items/:cartItemId` và `DELETE /api/v1/cart` đều scope theo Cart owner; CartItem IDOR trả 404.
- Cart projection tính `subtotal`/`lineSubtotal` từ giá Variant hiện tại, trả warning `VARIANT_NOT_SELLABLE`, `OUT_OF_STOCK` hoặc `INSUFFICIENT_AVAILABLE_STOCK`, và không tự xóa item lỗi.
- Không có Cart command nào reserve/decrement Inventory; checkout mới revalidate và reserve trong transaction riêng.

## Shipping quote và COD Checkout

- `POST /api/v1/shipping/quote` suy ra address/package/price/quantity/weight/dimensions từ dữ liệu thuộc user và trả quote fingerprint HMAC có TTL; client không có quyền gửi fee hoặc package authority.
- `POST /api/v1/checkout/orders` yêu cầu fingerprint đúng user + address + Cart hiện tại. Quote hết hạn, bị sửa hoặc Cart thay đổi trả `409 SHIPPING_QUOTE_STALE` để frontend báo giá lại trước khi submit.
- Checkout khóa Cart, revalidate sellability/current price, reserve Inventory, snapshot Order/Items/address/shipping, tạo COD Payment/transactions/history và clear Cart trong một transaction.

## Order operations

- Customer chỉ đọc/hủy đơn của mình; operational endpoints tách capability confirm/cancel/pack/ship/deliver/complete và trả `allowedActions` từ backend.
- Các xung đột do trạng thái Order không hợp lệ trả `409 INVALID_ORDER_TRANSITION`; đơn đã thanh toán không thể hủy trả `409 PAID_ORDER_CANNOT_CANCEL` để frontend ánh xạ UX riêng, thay vì dùng thông báo conflict chung.
- List/detail dùng read projection riêng. Customer detail không trả user/email/actor ID nội bộ; payment transactions không bị nạp khi response không sử dụng.
- Complete chỉ chấp nhận Order `DELIVERED` có COD Payment `PENDING`, sau đó ghi PAID + COD_COLLECTED nguyên tử. Mọi trạng thái payment khác đều fail-closed.

## Migration và seed

Chạy từ thư mục gốc monorepo:

```powershell
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:status
```

Seed tạo bốn role, năm tài khoản demo (gồm một Customer `DISABLED`), địa chỉ canonical mặc định cho Customer active, một kho chính, catalog ba sản phẩm cùng variant/tồn kho ban đầu. Seed có thể chạy lặp lại mà không nhân bản dữ liệu.

Seed demo từ chối chạy khi `NODE_ENV=production`. Tài khoản production phải được provision bằng quy trình quản trị riêng; không đổi cờ môi trường để đưa các tài khoản demo vào production.

## Kiểm thử

```powershell
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:db
pnpm test:db:rehearsal
pnpm --filter api lint
pnpm --filter api build
```

`test:e2e` chỉ chạy HTTP/API suites; `test:db` chỉ chạy schema/transaction/concurrency suites. Cả hai tự dựng database tạm từ rỗng, migrate/seed và tự dọn. `test:db:rehearsal` còn chạy seed hai lần để kiểm idempotency. Các cập nhật giữ hàng và ghi sổ kho được thực hiện trong cùng transaction; khóa theo thứ tự xác định để giảm nguy cơ deadlock.

## Nguyên tắc repository

- Prisma chỉ được truy cập qua database module/repository của backend.
- Use case nhiều bước nhận cùng transaction client để đảm bảo atomicity.
- Giữ hàng dùng câu lệnh `UPDATE ... WHERE on_hand - reserved >= quantity RETURNING ...`; không thực hiện kiểu đọc trước rồi ghi sau.
- Mỗi biến động kho phải có bản ghi `inventory_transactions` với ảnh chụp before/after.
