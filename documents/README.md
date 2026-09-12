# Tài liệu dự án

Tài liệu được gom theo mục đích để dễ tra cứu và giữ nguyên tên file gốc.

| Thư mục | Nội dung |
| --- | --- |
| [`plan/`](./plan/) | Kế hoạch triển khai, nhiệm vụ, lộ trình và kế hoạch kỹ thuật |
| [`specs/`](./specs/) | Đặc tả và quyết định nghiệp vụ/kỹ thuật làm source of truth |
| [`testing/`](./testing/) | Chiến lược, ma trận và hướng dẫn kiểm thử |
| [`audit/`](./audit/) | Báo cáo audit, kiểm tra bảo mật và bằng chứng nghiệm thu |
| [`operations/`](./operations/) | Cấu hình, khởi động và vận hành local/CI |
| [`reference/`](./reference/) | Bộ tài liệu nguồn Day 1–24 (DOCX gốc và bản Markdown trong [`reference/markdown/`](./reference/markdown/)) |
| [`archive/`](./archive/) | Bản ZIP lưu trữ/snapshot, không dùng làm source of truth |

## Nguồn source-of-truth & thứ tự ưu tiên

Khi hai tài liệu nói khác nhau về cùng một quy tắc, ưu tiên theo thứ tự (theo Day 15 §1):

1. **`specs/` + Day 15 (Final Specification)** — hợp đồng hiện hành để triển khai.
2. **Tài liệu Day chuyên sâu mới hơn** của domain tương ứng.
3. **Day freeze cũ hơn** (Day 1–14) — giữ giá trị lịch sử, **không** override quyết định đã freeze.
4. **Requirement/architecture ban đầu**.

> ⚠️ **Cảnh báo nội dung lỗi thời:** một số tài liệu Day 1–14 vẫn chứa quyết định **đã bị SUPERSEDED** (danh sách tại Day 15 Part 1 §35 — ví dụ Address có `district/city`, generic PATCH order status, adjustment bằng delta tùy ý...). Luôn đối chiếu **code thật** (`apps/api`, `apps/web`, `prisma/schema.prisma`) khi triển khai; code là tầng thực thi cuối cùng.

## Lối vào nhanh

- [Kế hoạch Day 7–12](./plan/KE_HOACH_TRIEN_KHAI_DAY_7_12.md)
- [Kế hoạch database layer](./plan/KE_HOACH_TRIEN_KHAI_DATABASE_LAYER.md)
- [Tài liệu tham khảo Markdown (Day 1–24)](./reference/markdown/README.md)
- [Đặc tả Auth/RBAC](./specs/DAC_TA_AUTH_RBAC.md)
- [Báo cáo audit Day 7–12](./audit/BAO_CAO_AUDIT_DAY_7_12.md)
- [Hướng dẫn cấu hình và chạy dự án](./operations/HUONG_DAN_CAU_HINH_VA_CHAY_DU_AN.md)
