# Thư mục Bug — Phân tích & theo dõi lỗi code

Thư mục này chứa các báo cáo **phân tích bug ở tầng code** (`apps/api`, `apps/web`), tách biệt với `audit/` (vốn tập trung tài liệu & nhất quán docs↔code).

| Tài liệu | Nội dung |
| --- | --- |
| [`BAO_CAO_PHAN_TICH_BUG_CODE.md`](./BAO_CAO_PHAN_TICH_BUG_CODE.md) | Phân tích tĩnh code: correctness, bảo mật, concurrency, tiền tệ, transaction. Phân loại theo mức độ + vị trí `file:dòng`. |

## Quy ước mức độ
- 🔴 **Cao** — cần vá trước khi triển khai tiếp.
- 🟠 **Trung bình** — nên vá sớm (perf/latent).
- 🟡 **Thấp** — robustness/cosmetic, vá khi có thời gian.

## Ghi chú
- Các báo cáo ở đây là **phân tích tĩnh** (đọc code), chưa chạy test động trừ khi ghi rõ.
- Chưa thực hiện sửa code; mỗi mục có khuyến nghị riêng để triển khai khi được duyệt.
