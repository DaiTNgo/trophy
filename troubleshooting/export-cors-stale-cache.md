# Export CORS Error — Stale Disk Cache

**Date:** 2026-09-05  
**Symptom area:** Admin › Order Detail › Export PDF / Export Raster

---

## Symptom

- Preview canvas trên Order Detail hiển thị ảnh sản phẩm bình thường.
- Khi bấm Export (PDF hoặc PNG/WebP), browser báo lỗi CORS cho cùng URL asset đó.

```
Access to fetch at 'https://backend.dai-ngo.workers.dev/api/assets/products/<id>/content'
from origin 'https://admin.dai-ngo.workers.dev' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

DevTools Network tab cho thấy request preview trả về `200 OK (from disk cache)`, còn request export không có response.

---

## Root Cause

### Chuỗi sự kiện

1. **Preview** dùng `<img src="...">` — browser fetch **không có `Origin` header** (đây là behavior mặc định của `<img>` tag không có `crossOrigin` attribute).
2. Backend trả về response kèm `cache-control: public, max-age=31536000, immutable`.
3. Browser cache response này vào disk cache **1 năm** — tại thời điểm đó, backend chưa có CORS middleware cho `/api/assets/*`, nên response **không có `Access-Control-Allow-Origin` header**.
4. **Export** gọi `fetch(url)` — browser gửi request có `Origin` header → browser kiểm tra cache → tìm thấy response cũ → response **thiếu `Access-Control-Allow-Origin`** → browser block.

### Tại sao preview không bị?

`<img>` tag hiển thị ảnh không cần CORS. Browser chỉ enforce CORS khi JS cần **đọc** response (qua `fetch()`, `XMLHttpRequest`, hoặc `<canvas>` với `crossOrigin`). `<img>` chỉ render, không expose bytes cho JS.

### Tại sao sau khi deploy CORS vẫn bị?

Vì response đã được cache từ trước. `immutable` báo cho browser biết "file này không bao giờ thay đổi, đừng hỏi lại". Browser tuân thủ đúng — không gửi request mới lên server ngay cả khi server đã được update.

---

## Fix

Thêm `{ cache: "reload" }` vào tất cả `fetch()` dùng trong export flow — buộc browser bỏ qua disk cache và fetch mới từ server. Server hiện tại đã có CORS header đúng, nên response mới sẽ có `Access-Control-Allow-Origin: *`.

### `apps/admin/src/lib/raster-export.ts`

```ts
// Before
const response = await fetch(resolvedUrl);

// After
const response = await fetch(resolvedUrl, { cache: "reload" });
```

### `apps/admin/src/lib/pdf-export.ts`

```ts
// Before
return fetch(resolvedUrl).catch(() => null);

// After
return fetch(resolvedUrl, { cache: "reload" }).catch(() => null);
```

---

## `cache: "reload"` là gì?

| Mode | Behavior |
|---|---|
| `"default"` | Dùng cache nếu có và còn hạn |
| `"no-cache"` | Hỏi server (conditional GET với `If-None-Match`), nhưng vẫn có thể dùng cache nếu server trả `304` |
| `"reload"` | Bỏ qua cache hoàn toàn, fetch mới từ server, sau đó cập nhật cache với response mới |
| `"no-store"` | Bỏ qua cache và không lưu response vào cache |

`"reload"` là lựa chọn đúng cho export: luôn lấy response fresh (có CORS header), nhưng vẫn cập nhật cache cho lần dùng sau.

---

## Cleanup liên quan

`raster-export.ts` trước đó dùng `backendFetch` (thêm `Authorization: Bearer <token>`) cho asset URL. Vì `/api/assets/*` là **public route** (không có auth middleware), token này thừa. Đã đơn giản hóa về plain `fetch` với URL resolution giống `pdf-export.ts`:

```ts
// Removed: import { backendFetch, BACKEND_URL } from "./fetch";
// Added:   import { BACKEND_URL } from "./fetch";

// Removed complex isExternal logic:
// const isExternal = url.startsWith("blob:") || ...
// const response = await (isExternal ? fetch(url, { mode: "cors" }) : backendFetch(url));

// Simplified to match pdf-export.ts pattern:
const resolvedUrl = url.startsWith("/")
  ? `${BACKEND_URL.replace(/\/$/, "")}${url}`
  : url;
const response = await fetch(resolvedUrl, { cache: "reload" });
```

---

## Lesson Learned

- `<img>` và `fetch()` cache độc lập về mặt CORS semantics, nhưng browser có thể serve cùng một cache entry cho cả hai. Response được cache từ `<img>` (không có CORS header) sẽ làm `fetch()` fail.
- `cache-control: immutable` + không có `Access-Control-Allow-Origin` là combo nguy hiểm: lỗi sẽ persist 1 năm trong browser của user đó.
- Với public asset luôn nên ensure CORS header có trong response **trước khi** deploy `immutable` cache policy.
- Export flow (fetch binary để xử lý) nên luôn dùng `{ cache: "reload" }` để tránh stale cache, khác với render (`<img>`) có thể dùng cache.
