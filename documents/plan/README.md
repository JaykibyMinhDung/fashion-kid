# Danh Mục Kế Hoạch Triển Khai Theo Giai Đoạn & Ngày (Implementation Plans)

Thư mục này tập trung toàn bộ các kế hoạch kỹ thuật, kiến trúc và lộ trình triển khai chi tiết cho từng Phase / Ngày của dự án **Kids Fashion E-commerce**, phục vụ việc theo dõi tiến độ, đối soát chất lượng và quy chuẩn nghiệm thu (Quality Gates).

---

## Bảng Tổng Hợp Kế Hoạch Triển Khai

| Phase / Ngày | Nội Dung Trọng Tâm | Trạng Thái | Tài Liệu Chi Tiết |
| :--- | :--- | :---: | :--- |
| **Phase F0 (Day 0)** | Kiến trúc cơ sở dữ liệu, Schema, Migrations, Idempotent Seeds | ✅ Hoàn thành | [KE_HOACH_TRIEN_KHAI_DATABASE_LAYER.md](./KE_HOACH_TRIEN_KHAI_DATABASE_LAYER.md) |
| **Day 1 — 5** | Xác thực người dùng (Auth), RBAC 4 vai trò, Session Hardening | ✅ Hoàn thành | [KE_HOACH_KY_THUAT_AUTH_RBAC.md](./KE_HOACH_KY_THUAT_AUTH_RBAC.md) |
| **Phase M5 (Day 7)** | Trừu tượng hóa báo giá vận chuyển + Đặt hàng COD nguyên tử (11 bước) | ✅ Hoàn thành | [PLAN_PHASE_M5_DAY_7.md](./PLAN_PHASE_M5_DAY_7.md) |
| **Phase M6 (Day 8 & 9)** | Vòng đời đơn hàng nội bộ (Customer, Sales, Warehouse, Admin) + Khóa dòng | ✅ Hoàn thành | [PLAN_PHASE_M6_DAY_8_9.md](./PLAN_PHASE_M6_DAY_8_9.md) |
| **Phase M7 (Day 12)** | Báo cáo thống kê Read-only, Admin Dashboard 5 KPI, Timezone UTC+7 | 📋 Sẵn sàng làm | [PLAN_PHASE_M7_DAY_12.md](./PLAN_PHASE_M7_DAY_12.md) |
| **Phase M8 (Day 8/9 Provider)** | Kiên cố hóa GHN Shipping & Cổng thanh toán VNPay (Adapter / Webhook) | 📋 Sẵn sàng làm | [PLAN_PHASE_M8_PROVIDER_HARDENING.md](./PLAN_PHASE_M8_PROVIDER_HARDENING.md) |

---

## Cấu Trúc Tài Liệu Trong Thư Mục `/documents/plan/`

- [`PLAN_PHASE_M5_DAY_7.md`](./PLAN_PHASE_M5_DAY_7.md): Kế hoạch và tổng kết nghiệm thu Phase M5 (Báo giá cước + Checkout COD chống IDOR).
- [`PLAN_PHASE_M6_DAY_8_9.md`](./PLAN_PHASE_M6_DAY_8_9.md): Kế hoạch và tổng kết nghiệm thu Phase M6 (Máy trạng thái đơn hàng 7 bước, Concurrency E2E, 8 màn hình quản trị).
- [`PLAN_PHASE_M7_DAY_12.md`](./PLAN_PHASE_M7_DAY_12.md): Kế hoạch kiến trúc Phase M7 (Module Reporting, Parameterized SQL, 5 endpoint KPI, biểu đồ SVG nhẹ).
- [`PLAN_PHASE_M8_PROVIDER_HARDENING.md`](./PLAN_PHASE_M8_PROVIDER_HARDENING.md): Kế hoạch kiến trúc Phase M8 (GHN client/webhook đối soát timeout, VNPay HMAC-SHA512 + IPN authority).

---

## Tài Liệu Tham Chiếu Gốc
- Kế hoạch tổng thể: [`KE_HOACH_TRIEN_KHAI_DAY_7_12.md`](./KE_HOACH_TRIEN_KHAI_DAY_7_12.md)
- Danh mục nhiệm vụ: [`NHIEM_VU_TRIEN_KHAI_DAY_7_12.md`](./NHIEM_VU_TRIEN_KHAI_DAY_7_12.md)
- Chiến lược kiểm thử: [`CHIEN_LUOC_KIEM_THU_DAY_7_12.md`](../testing/CHIEN_LUOC_KIEM_THU_DAY_7_12.md)
