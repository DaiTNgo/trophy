# Trophy Monorepo

Hệ thống thương mại điện tử chuyên biệt cho sản phẩm cúp, huy chương và quà tặng lưu niệm (Customizable Trophy E-Commerce Platform), được tổ chức dưới dạng pnpm monorepo.

---

## 🏗️ Cấu trúc dự án (Architecture & Apps)

Dự án gồm 3 ứng dụng chính và các gói thư viện chia sẻ trong monorepo:

| Ứng dụng / Package | Filter name | Công nghệ | Cổng Dev | Cổng Production | Mô tả |
|---|---|---|---|---|---|
| `apps/backend` | `backend` | Hono + Node.js + Drizzle ORM | `8787` | `8787` (Nội bộ) | REST API & RPC routes, Better-Auth, MISA integration, Background cron tasks |
| `apps/storefront` | `router-cf` | React Router v7 (SSR) | `5173` | `3000` (Nội bộ) | Giao diện bán hàng cho khách hàng, bộ tùy biến sản phẩm (Customizer), checkout |
| `apps/admin` | `admin` | React SPA + `@medusajs/ui` | `5174` | `80` (Nội bộ) | Cổng quản trị viên, quản lý sản phẩm, đơn hàng, tùy biến, bài viết |
| `packages/customization` | `customization` | TypeScript | — | — | Shared types & validation cho bộ thiết kế tùy biến |
| `packages/customization-react` | `customization-react` | React 19 | — | — | React canvas editor component cho tùy biến cúp |
| `docker/gateway` | `gateway` | Nginx Alpine | — | `80` / `443` | Reverse Proxy & Gateway đón traffic, phân phối domain và routing |

---

## 🐳 Triển khai với Docker (Production trên VPS)

Hệ thống được đóng gói hoàn chỉnh bằng Docker Compose, sẵn sàng chạy trên mọi VPS có cài đặt Docker & Docker Compose.

### Các dịch vụ trong cụm Docker (`docker-compose.yml`):
- **`db`** (`postgres:16-alpine`): Cơ sở dữ liệu PostgreSQL lưu trên volume `postgres_data`.
- **`backend`**: Ứng dụng Hono chạy trên Node.js 22, lưu trữ file vào volume `storage_data`.
- **`storefront`**: Ứng dụng React Router chạy SSR trên Node.js 22 (kết nối nội bộ tới `backend:8787`).
- **`admin`**: Ứng dụng SPA được build tĩnh và phục vụ bởi Nginx.
- **`gateway`**: Nginx Reverse Proxy đón traffic cổng `80`/`443` ra ngoài internet và điều hướng:
  - Subdomain `admin.*` hoặc đường dẫn `/admin/` $\rightarrow$ Admin Portal
  - Subdomain `api.*` hoặc đường dẫn `/api/` & `/fonts/` $\rightarrow$ Backend API
  - Mặc định `/` $\rightarrow$ Storefront SSR

### Các bước triển khai VPS:

1. **Chuẩn bị cấu hình môi trường:**
   ```bash
   cp .env.example .env
   ```
   *Mở file `.env` và cập nhật các thông số bảo mật:*
   - `POSTGRES_PASSWORD`: Mật khẩu cơ sở dữ liệu mạnh.
   - `BETTER_AUTH_SECRET`: Khóa bí mật ngẫu nhiên (32 ký tự trở lên).
   - `BETTER_AUTH_URL`, `ADMIN_APP_ORIGIN`, `STOREFRONT_APP_ORIGIN`: Domain thật của bạn (ví dụ: `https://trophy.vn`).

2. **Khởi động toàn bộ hệ thống bằng Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

3. **Khởi tạo schema database PostgreSQL (chỉ cần chạy lần đầu):**
   ```bash
   docker compose exec backend pnpm db:push
   ```

4. **Kiểm tra trạng thái & logs:**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

5. **Khởi tạo tài khoản quản trị viên (Admin Bootstrap):**
   - Mở trình duyệt truy cập vào giao diện Admin (`/admin` hoặc `admin.yourdomain.com`).
   - Giao diện Onboarding sẽ tự động hiển thị để bạn thiết lập tài khoản quản trị viên đầu tiên (`super-admin`).

---

## 💻 Hướng dẫn phát triển cục bộ (Local Hybrid Dev)

Để đạt tốc độ phát triển cao nhất với Hot Module Replacement (HMR) tức thì trên máy Mac/PC:

### 1. Khởi động PostgreSQL qua Docker
Chỉ cần chạy container database trong nền:
```bash
docker compose up -d db
```

### 2. Cài đặt dependencies & Sync schema
```bash
./init.sh                        # Cài đặt và verify toàn bộ monorepo
pnpm --filter backend db:push    # Đẩy schema vào Postgres local
```

### 3. Chạy các app bằng `pnpm dev`
Mở 3 terminal riêng hoặc chạy song song:
```bash
# Terminal 1: Backend API (cổng 8787)
pnpm --filter backend dev

# Terminal 2: Storefront SSR (cổng 5173)
pnpm --filter router-cf dev

# Terminal 3: Admin Portal (cổng 5174)
pnpm --filter admin dev
```

---

## 🗄️ Quản lý Cơ sở dữ liệu (Drizzle ORM)

Dự án sử dụng **Drizzle ORM** với PostgreSQL. Schema được định nghĩa tại [`apps/backend/src/db/schema.ts`](./apps/backend/src/db/schema.ts).

Các lệnh quản lý:
```bash
# Đẩy trực tiếp schema thay đổi vào DB (Development / Setup mới)
pnpm --filter backend db:push

# Tạo migration file khi có thay đổi schema
pnpm --filter backend db:generate

# Chạy migration
pnpm --filter backend db:migrate

# Mở giao diện trực quan Drizzle Studio để xem & sửa data
pnpm --filter backend studio
```

---

## 📂 Quản lý Lưu trữ tập tin (Storage)

Hệ thống sử dụng **Local Storage Volume** lưu trữ trên ổ đĩa VPS (thay thế Cloudflare R2):
- Mã nguồn adapter: [`apps/backend/src/lib/storage.ts`](./apps/backend/src/lib/storage.ts).
- Thư mục lưu trữ: Được mount vào `/app/apps/backend/storage` trên Docker volume `storage_data`.
- Tự động quản lý MD5 Etag, MIME type, stream tải file nhanh và an toàn.

---

## 🧪 Kiểm tra & Nghiệm thu (Verification)

Trước khi commit code hoặc deploy, luôn chạy script kiểm tra toàn diện:
```bash
./init.sh
```

Script này tự động:
1. `pnpm install` — Đồng bộ dependencies workspace
2. `pnpm --filter backend check` — Type-check Backend TypeScript
3. `pnpm --filter backend test` — Chạy toàn bộ 340+ unit & API contract tests
4. `pnpm --filter backend build` — Build bundle Backend
5. `pnpm --filter admin build` — Type-check & build Admin SPA
6. `pnpm --filter router-cf typecheck` — Type-check Storefront SSR
7. `pnpm --filter router-cf build` — Build SSR & Client bundle Storefront

---

## 🛡️ Tối ưu hóa Bảo mật & Hiệu năng (Hardening & Optimization)

Hệ thống Docker đã được cấu hình các tiêu chuẩn khắt khe cho môi trường Production:

### 1. Bảo mật & Chống xâm nhập (Security & Anti-hack)
* **Non-root Containers:** Backend và Storefront chạy dưới user phi đặc quyền (`USER node`, UID 1000), ngăn chặn nguy cơ container breakout chiếm quyền root host.
* **Network Isolation:** PostgreSQL chỉ lắng nghe duy nhất trên `127.0.0.1:5432` và mạng Docker nội bộ. Tuyệt đối **không mở cổng database ra ngoài internet**.
* **Ngăn chặn leo thang đặc quyền:** Toàn bộ services được gắn cờ `security_opt: [no-new-privileges:true]`.
* **Chống Brute-force & DDoS:** Nginx Gateway được cấu hình rate limiting theo IP:
  * `/api/admin/auth/` (Login/Auth): Giới hạn 5 req/s (burst 10) chống vét cạn mật khẩu.
  * `/api/`: Giới hạn 30 req/s (burst 50) chống spam request.
  * `limit_conn`: Giới hạn tối đa 50 kết nối đồng thời trên mỗi IP.
* **Chống tấn công Slowloris:** Cấu hình thời gian chờ nghiêm ngặt (`client_body_timeout 15s`, `client_header_timeout 15s`, `send_timeout 15s`).
* **Chống rò rỉ thông tin:** Bật `server_tokens off` (ẩn phiên bản Nginx), tự động chặn mọi request đến file ẩn (`.env`, `.git`).
* **Security Headers:** Tự động đính kèm `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy`.
* **Chống Path Traversal:** `LocalStorageAdapter` xác thực đường dẫn tuyệt đối theo `baseDir`, chặn đứng kỹ thuật `../` đọc trộm file hệ thống.

### 2. Tối ưu hóa Hiệu năng (Performance Optimization)
* **HTTP Keepalive Connection Pooling:** Nginx duy trì pool kết nối keepalive (32 connection) liên tục với Backend và Storefront qua HTTP 1.1, giảm thiểu độ trễ bắt tay TCP cho từng request.
* **Nén Gzip tự động:** Bật nén Gzip mức 6 cho toàn bộ payload JSON, HTML, CSS, JavaScript, SVG, giảm tới 70-80% băng thông truyền tải.
* **Bộ nhớ đệm Asset tĩnh (Immutable Cache):** Các tài nguyên JS, CSS, Font có hash được cấu hình `Cache-Control: public, max-age=31536000, immutable`, giảm tải tối đa cho server.
* **Giới hạn tài nguyên (Resource Limits):** Mỗi container đều có giới hạn trần RAM rõ ràng (Backend 1GB, Storefront 1GB, Database 1GB, Admin/Gateway 256MB) tránh nguy cơ 1 tiến trình ngốn cạn RAM gây treo VPS.
* **Xoay vòng Log (Log Rotation):** Giới hạn tối đa 5 file log (mỗi file 20MB) cho mỗi container, đảm bảo ổ cứng VPS không bị tràn do log sau thời gian dài vận hành.

