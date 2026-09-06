import { useEffect, useState } from "react";
import { backendFetch, BACKEND_URL } from "../../lib/fetch";
import { renderPdfBufferToDataUrl } from "../../lib/pdf-preview";
import { Package, FileText } from "lucide-react";

export type MediaPreviewProps = {
  /**
   * File object đang chờ upload (staged file, chưa gửi lên server).
   *
   * Component sẽ tự tạo blob URL từ file này và revoke khi unmount,
   * không cần caller quản lý lifecycle của URL.
   * Render được ngay ở frame đầu tiên, không có bước async nào.
   *
   * Nếu truyền cả `file` và `src`, `file` luôn được ưu tiên.
   */
  file?: File;

  /**
   * URL của asset đã được lưu trên server.
   *
   * Ví dụ: `/api/assets/customizations/{id}/content`
   *
   * Chỉ dùng khi `file` không được truyền vào.
   * Component tự xử lý các trường hợp đặc biệt:
   * - Image → dùng URL trực tiếp
   * - PDF → render trang đầu thành ảnh qua pdfjs
   * - SVG / PNG / JPEG → dùng URL trực tiếp
   */
  src?: string;

  /**
   * MIME type của asset, ví dụ `"image/webp"`, `"image/svg+xml"`, `"application/pdf"`.
   *
   * Dùng để phân biệt cách xử lý khi `src` được truyền vào:
   * - `"application/pdf"` → kích hoạt PDF renderer
   * - Image → hiển thị trực tiếp bằng `<img>`
   * - Các loại còn lại → render trực tiếp bằng `<img>`
   *
   * Có thể bỏ qua nếu bạn chắc chắn asset không phải PDF hay WebP.
   */
  mimeType?: string;

  /**
   * Alt text cho thẻ `<img>`, dùng cho accessibility.
   * Mặc định: `"Media"` (khi dùng `src`) hoặc `"Preview"` (khi dùng `file`).
   */
  alt?: string;

  /**
   * Tailwind className áp vào thẻ `<img>` hoặc div fallback.
   * Dùng để set kích thước, object-fit, border, v.v.
   *
   * Ví dụ: `"h-20 w-20 rounded object-contain"`
   */
  className?: string;

  /**
   * Nội dung hiển thị khi không có `src`/`file` hoặc khi ảnh load lỗi.
   * Mặc định: icon `<Package />` từ lucide-react.
   *
   * Chỉ áp dụng khi dùng `src` (không áp dụng cho `file` mode).
   */
  fallback?: React.ReactNode;
};


// ── File mode ────────────────────────────────────────────────────────────────

function FilePreview({
  file,
  alt = "Preview",
  className = "",
}: {
  file: File;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string>(() => URL.createObjectURL(file));
  const [error, setError] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    setError(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted ${className}`}>
        <Package className="w-5 h-5" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
}

// ── URL mode ─────────────────────────────────────────────────────────────────

function resolveLocalUrl(src?: string): string | null {
  if (!src) return null;
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;
  return null;
}

function UrlPreview({
  src,
  mimeType,
  alt = "Media",
  className = "",
  fallback,
}: {
  src: string;
  mimeType?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(() => resolveLocalUrl(src));
  const [error, setError] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    setError(false);

    if (!src) {
      setDataUrl(null);
      setIsLoadingPdf(false);
      return;
    }

    // Local blob / data URL — resolve immediately.
    if (src.startsWith("blob:") || src.startsWith("data:")) {
      setDataUrl(src);
      setIsLoadingPdf(false);
      return;
    }

    const resolvedUrl = src.startsWith("/") ? `${BACKEND_URL.replace(/\/$/, "")}${src}` : src;

    // PDF
    const isPdf = mimeType === "application/pdf" || src.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      let isCancelled = false;
      setIsLoadingPdf(true);

      const load = async () => {
        try {
          const isAsset = src.startsWith("/api/assets/") || src.includes("/api/assets/");
          const res = isAsset ? await fetch(resolvedUrl) : await backendFetch(src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.startsWith("image/")) {
            const blob = await res.blob();
            if (!isCancelled) setDataUrl(URL.createObjectURL(blob));
            return;
          }

          const buffer = await res.blob().then((b) => b.arrayBuffer());
          if (isCancelled) return;

          const result = await renderPdfBufferToDataUrl(buffer, 1.0, "image/webp", 0.9);
          if (!isCancelled) {
            setDataUrl(result.dataUrl);
          }
        } catch {
          if (!isCancelled) setError(true);
        } finally {
          if (!isCancelled) setIsLoadingPdf(false);
        }
      };

      load();
      return () => { isCancelled = true; };
    }

    // Images are public capability URLs. Let the browser load them directly.
    setDataUrl(resolvedUrl);
    setIsLoadingPdf(false);
  }, [src, mimeType]);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted ${className}`}>
        {fallback ?? <Package className="w-5 h-5" />}
      </div>
    );
  }

  if (isLoadingPdf && !dataUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-ui-bg-subtle text-ui-fg-muted animate-pulse ${className}`}>
        <FileText className="w-5 h-5 mb-1" />
        <span className="text-[10px]">Loading PDF…</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted animate-pulse ${className}`}>
        {fallback ?? <Package className="w-5 h-5" />}
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={className}
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Unified media preview component.
 *
 * Pass `file` for a File staged for upload (blob URL managed internally).
 * Pass `src` for an already-persisted asset URL (handles PDF, WebP fetch, etc.).
 */
export function MediaPreview({ file, src, mimeType, alt, className, fallback }: MediaPreviewProps) {
  if (file) {
    return <FilePreview file={file} alt={alt} className={className} />;
  }
  if (src) {
    return <UrlPreview src={src} mimeType={mimeType} alt={alt} className={className} fallback={fallback} />;
  }
  return (
    <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted ${className}`}>
      {fallback ?? <Package className="w-5 h-5" />}
    </div>
  );
}
