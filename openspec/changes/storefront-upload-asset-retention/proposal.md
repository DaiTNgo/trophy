## Why

Mỗi lần shopper thay ảnh trên trang chi tiết sản phẩm, hệ thống lưu một asset mới ngay vào R2 và D1. Các asset bị thay thế hoặc bị bỏ lại trong browser cart hiện không có vòng đời kết thúc, nên dung lượng và metadata sẽ tích lũy vô hạn.

## What Changes

- Gắn vòng đời tạm thời 14 ngày cho shopper customization asset khi upload.
- Giữ asset tạm còn hiệu lực để shopper có thể quay lại browser cart và checkout trong thời hạn đó.
- Khi checkout tạo order thành công, đánh dấu các asset được order tham chiếu là retained để chúng không bị dọn theo chính sách tạm thời.
- Thêm scheduled cleanup để xóa metadata D1 và object R2 của asset tạm đã hết hạn, theo cách chịu lỗi và có thể chạy lại an toàn.
- Làm rõ phản hồi cho trường hợp browser cart trỏ đến asset đã hết hạn, để shopper biết cần upload ảnh lại thay vì gặp preview lỗi.

## Capabilities

### New Capabilities

- `shopper-customization-asset-retention`: Quản lý vòng đời asset shopper upload, giữ tạm 14 ngày, retain cho order đã checkout, và dọn asset hết hạn.

### Modified Capabilities

- None.

## Impact

- `apps/backend`: schema D1 cho trạng thái/hạn dùng asset, storefront upload và order creation contracts, Cloudflare Worker scheduled handler, R2 cleanup, cùng API/service tests.
- `apps/backend/wrangler.jsonc`: cấu hình cron trigger cho Worker.
- `apps/storefront`: xử lý rõ asset upload đã hết hạn khi khôi phục hoặc xem browser cart/PDP.
- Cloudflare D1 và R2: lifecycle dữ liệu cho shopper upload; không áp dụng cho product, clipart, font, hoặc admin-managed assets.
