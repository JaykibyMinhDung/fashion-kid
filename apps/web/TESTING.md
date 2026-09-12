# Quy định kiểm thử frontend

Mục tiêu của bộ test là ngăn những hành vi đã được nghiệm thu tái phát sinh lỗi mà không bị phát hiện. Test không thể chứng minh phần mềm tuyệt đối không còn lỗi, nhưng một thay đổi không được phép merge hoặc build nếu làm hỏng hành vi đã được mã hóa thành regression test.

## Definition of Done bắt buộc

Một chức năng chỉ được xem là hoàn tất khi đáp ứng đủ các điều kiện sau:

1. Có tiêu chí nghiệm thu mô tả bằng hành vi người dùng, không phụ thuộc chi tiết cài đặt.
2. Có test cho happy path và các validation, error state, permission boundary có liên quan.
3. Sau khi người dùng xác nhận chức năng “OK”, hành vi đó phải có regression test mang mã `REG-<DOMAIN>-<SỐ>` trước khi merge.
4. Mọi bug fix phải bắt đầu bằng một test tái hiện lỗi và test đó phải fail trước khi sửa.
5. `npm run verify` và `npm run build` phải pass. `npm run build` luôn tự chạy toàn bộ test trước production build.

Không được xóa, bỏ qua hoặc làm yếu assertion của regression test chỉ để pipeline pass. Nếu nghiệp vụ chủ động thay đổi, phải cập nhật tiêu chí nghiệm thu và regression test trong cùng pull request.

## Chọn đúng tầng test

- Helper, mapper, formatter và quy tắc dữ liệu: Vitest unit test.
- Client Component và hành vi UI đồng bộ: Testing Library; kiểm tra nội dung, accessible role và kết quả người dùng nhìn thấy.
- Route scope, permission boundary và giao diện đã được nghiệm thu: regression test trong `src/__tests__/regression`.
- Async Server Component hoặc flow xuyên nhiều trang/API như đăng nhập, giỏ hàng, đặt hàng, xử lý kho: Playwright E2E khi domain tương ứng được mở.

Ưu tiên assertion theo hành vi và khả năng truy cập. Snapshot chỉ được dùng cho dữ liệu ổn định, không thay thế assertion nghiệp vụ.

## Lệnh sử dụng

```bash
npm run test
npm run test:regression
npm run test:watch
npm run typecheck
npm run verify
npm run build
```

CI chạy trên mọi pull request và push. Pull request chỉ được merge khi job `Frontend quality gate` pass và checklist nghiệm thu đã hoàn thành.

## Quy trình khóa một chức năng đã nghiệm thu

1. Ghi lại flow, dữ liệu đầu vào và kết quả người dùng vừa xác nhận.
2. Thêm hoặc cập nhật test `REG-<DOMAIN>-<SỐ>` để thể hiện chính xác hành vi đó.
3. Chạy riêng regression test, sau đó chạy `npm run verify`.
4. Merge khi quality gate pass; từ đó mọi thay đổi sau đều phải vượt qua test này.
