# 1. Tách biệt Database Migration Script phục vụ Zero-Downtime Deployment

Date: 2026-10-04

## Trạng thái (Status)

Accepted

## Bối cảnh (Context)

Hệ thống đang chạy trong môi trường Docker bằng `docker-compose`. 
Trước đây, thư viện `drizzle-kit` nằm trong `devDependencies` nên không có trong production image, dẫn đến việc database không được tự động cấu hình (migrate) khi deploy lần đầu.
Có hai hướng giải quyết phổ biến cho Docker:
1. Chạy migration programmatically lúc app startup (`src/index.ts`).
2. Tách biệt việc migration ra một bước độc lập trước khi app startup.

Phương án 1 dễ thiết lập nhưng sẽ phá vỡ khả năng **Zero-Downtime Deployment**. Nếu ứng dụng gặp thay đổi schema lớn (như lock table hoặc xóa cột), các container cũ đang phục vụ người dùng sẽ bị nghẽn hoặc crash. Quá trình scale up nhiều container cũng có thể gây race-condition khi tất cả cùng cố gắng migrate.

## Quyết định (Decision)

Chúng tôi quyết định **không** chạy database migration tự động vào lúc startup của Node.js app. Thay vào đó:

1. Thiết lập một file script độc lập (`src/db/migrate.ts`) sử dụng programmatic migrator của Drizzle.
2. Compile script này chung với production build và bundle thư mục SQL `drizzle/` vào trong production image.
3. Quy trình deploy (hoặc CI/CD) sẽ chịu trách nhiệm chạy container độc lập với lệnh `node dist/backend/migrate.js` để cập nhật Database **trước khi** kích hoạt hoặc cập nhật các container backend chính.

## Hậu quả (Consequences)

- **Tích cực:** Quá trình khởi động của app backend được giữ sạch sẽ và nhanh chóng. Đảm bảo nền tảng kiến trúc cho Zero-Downtime deployment bằng cách hỗ trợ mô hình "Expand & Contract" cho Database. Không bị phụ thuộc vào công cụ CLI dev-only như `drizzle-kit` trên production.
- **Tiêu cực:** Các nhà phát triển/vận hành (hoặc CI/CD pipeline) phải ghi nhớ bước chạy lệnh migration `docker compose exec backend node dist/backend/migrate.js` (hoặc tương tự) mỗi khi có thay đổi DB, thay vì mọi thứ "tự động chạy" ngay khi gõ `docker compose up`.
