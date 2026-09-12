# Kids Fashion E-commerce

Monorepo fullstack cho hệ thống thương mại điện tử và quản lý bán hàng quần áo trẻ em.

Tài liệu vận hành đầy đủ: [Hướng dẫn cấu hình và chạy dự án](documents/operations/HUONG_DAN_CAU_HINH_VA_CHAY_DU_AN.md). Kế hoạch phạm vi nghiệp vụ tiếp theo: [Kế hoạch triển khai Day 7–12](documents/plan/KE_HOACH_TRIEN_KHAI_DAY_7_12.md).

## Công nghệ và cấu trúc

- `apps/web`: Next.js frontend, chạy mặc định tại `http://localhost:3000`.
- `apps/api`: NestJS + Prisma backend, chạy mặc định tại `http://localhost:8080`.
- `documents`: tài liệu phân tích, thiết kế và kế hoạch triển khai.
- PostgreSQL 17: database phát triển, ánh xạ ra cổng host `54329` để tránh xung đột với PostgreSQL cục bộ ở `5432`.
- Node.js `24.20.0` và pnpm `11.19.0` được khóa ở cấp workspace.

## Khởi tạo lần đầu

Yêu cầu: Node.js 24, Corepack và Docker Desktop đang hoạt động.

```powershell
nvm use
corepack enable
pnpm install --frozen-lockfile
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
pnpm db:up
docker compose ps
pnpm db:migrate:deploy
pnpm db:seed
```

Container `kids-fashion-postgres` phải ở trạng thái `healthy` trước khi chạy migration. Các file `.env`/`.env.local` chỉ dùng cục bộ và không được commit. Trước khi chạy API, thay `JWT_ACCESS_SECRET` mẫu bằng một secret ngẫu nhiên riêng cho môi trường:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Không dùng chung secret giữa local, CI, staging và production; không đưa kết quả lệnh trên vào source, log hoặc tài liệu.

Trên macOS/Linux, thay lệnh sao chép môi trường bằng:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Chạy ứng dụng

```powershell
# Chạy đồng thời web và API
pnpm dev

# Hoặc chạy riêng
pnpm dev:web
pnpm dev:api
```

## Cấu hình Auth giữa web và API

- `WEB_ORIGIN` là origin web chính xác, ví dụ `http://localhost:3000`; không có path hoặc dấu `/` cuối.
- `NEXT_PUBLIC_API_URL` là origin API công khai, ví dụ `http://localhost:8080`. Biến có tiền tố `NEXT_PUBLIC_` được đưa vào bundle web, nên tuyệt đối không đặt secret trong đó.
- API chỉ cho phép CORS từ đúng `WEB_ORIGIN` và cho phép gửi cookie. Web gọi trực tiếp API với `credentials: include`.
- Access token tồn tại trong bộ nhớ của tab và hết hạn sau 15 phút mặc định; không lưu vào `localStorage`, `sessionStorage` hay cookie.
- Refresh token là opaque token quay vòng trong cookie `HttpOnly`, `SameSite=Strict`, `Path=/`. Production dùng tiền tố `__Host-`, không đặt `Domain`, phải chạy HTTPS, đặt `COOKIE_SECURE=true` và triển khai web/API trong cùng site để phù hợp chính sách cookie này.
- Sau khi đổi mật khẩu hoặc logout, `auth_version` tăng để access token cũ bị từ chối ngay; refresh session liên quan cũng bị thu hồi. Refresh replay và tài khoản bị khóa vẫn fail-closed.

Sáu endpoint Auth hiện có: `register`, `login`, `refresh`, `logout`, `me` và `change-password` dưới prefix `/api/v1/auth`. Swagger ở `/api/docs` trong development/test và không được mount ở production; probe vận hành public dùng `/health/live` và `/health/ready`.

## Kiểm tra chất lượng

```powershell
# Lint, unit test, typecheck và production build toàn monorepo
pnpm verify

# HTTP/API E2E trên database tạm độc lập
pnpm test:e2e

# Invariant/schema/concurrency trên database tạm độc lập
pnpm test:db

# Kiểm tra migration, seed và toàn bộ ràng buộc database
pnpm verify:db

# Tạo DB tạm, migrate từ rỗng, seed hai lần, test rồi tự xóa DB tạm
pnpm test:db:rehearsal
```

`pnpm test:e2e` và `pnpm test:db` tự tạo database `kids_fashion_test_<pid>_<timestamp>`, migrate/seed rồi xóa trong `finally`; tài khoản PostgreSQL cần quyền `CREATE DATABASE`. `pnpm verify:db` vẫn migrate/seed database development được cấu hình trước khi gọi database suite isolated.
`pnpm test:db:rehearsal` yêu cầu tài khoản PostgreSQL trong `DATABASE_URL` có quyền tạo/xóa database; script chỉ xóa database tạm có tên an toàn do chính nó tạo.

## Quy trình thay đổi database

1. Sửa `apps/api/prisma/schema.prisma`.
2. Chạy `pnpm db:format` và `pnpm db:validate`.
3. Tạo migration trong môi trường phát triển bằng `pnpm db:migrate -- --name <ten_migration>`.
4. Bổ sung các `CHECK`, partial index hoặc SQL PostgreSQL đặc thù vào file migration nếu Prisma schema chưa biểu diễn được.
5. Chạy `pnpm db:generate`, `pnpm verify:db` và `pnpm verify` trước khi mở pull request.

Không dùng `db push` thay cho migration. `pnpm db:migrate:reset` xóa toàn bộ dữ liệu database hiện tại, chỉ được dùng với database phát triển cục bộ.

## Quy ước tiền tệ

- Database lưu số tiền bằng `BIGINT`, đơn vị đồng nhỏ nhất và không dùng số thực.
- API nhận/trả tiền bằng decimal string nghiêm ngặt, ví dụ `"159000"`.
- Không chuyển giá trị tiền sang JavaScript `number`; interceptor chung chuyển `bigint` thành decimal string khi serialize JSON.

## Lệnh database hữu ích

```powershell
pnpm db:up
pnpm db:status
pnpm db:logs
pnpm db:seed
pnpm db:down
```

Nếu Docker Desktop trên Windows không khởi động do unix socket `dockerInference` bị kẹt, hãy khởi động lại Windows rồi mở lại Docker Desktop. Không chọn factory reset khi chưa sao lưu volume; thao tác đó không phải một bước cài đặt của dự án.

Chi tiết backend và dữ liệu mẫu nằm tại [apps/api/README.md](apps/api/README.md); trạng thái frontend nằm tại [apps/web/README.md](apps/web/README.md).
