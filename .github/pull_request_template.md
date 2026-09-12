## Phạm vi

Mô tả ngắn thay đổi và role/domain bị ảnh hưởng.

## Nghiệm thu và regression

- [ ] Tiêu chí nghiệm thu đã được ghi rõ.
- [ ] Đã thêm/cập nhật test cho happy path và validation/error/permission liên quan.
- [ ] Hành vi đã được xác nhận “OK” có regression test `REG-<DOMAIN>-<SỐ>`, hoặc pull request này không thay đổi hành vi đã nghiệm thu.
- [ ] Bug fix có test tái hiện lỗi trước khi sửa, hoặc đây không phải bug fix.
- [ ] Không xóa, skip hoặc làm yếu regression test để pipeline pass.
- [ ] `pnpm verify` chạy pass tại workspace root.

## Kiểm thử thủ công

Ghi lại route, role, dữ liệu và kết quả đã kiểm tra.
