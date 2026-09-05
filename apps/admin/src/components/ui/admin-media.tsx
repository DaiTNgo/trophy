import { useState, useEffect } from "react";
import { backendFetch, BACKEND_URL } from "../../lib/fetch";
import { renderPdfBufferToDataUrl } from "../../lib/pdf-preview";
import { Package, FileText } from "lucide-react";

export type AdminMediaProps = {
  src?: string;
  mimeType?: string;
  className?: string;
  fallback?: React.ReactNode;
  alt?: string;
};

/** For local blob: / data: URLs we can resolve immediately without any async round-trip. */
function resolveLocalUrl(src?: string): string | null {
  if (!src) return null;
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;
  return null;
}

export function AdminMedia({ src, mimeType, className = "", fallback, alt = "Media" }: AdminMediaProps) {
  // Initialise synchronously for blob/data URLs so the first render already
  // shows the image — no intermediate null state, no race with onError.
  const [dataUrl, setDataUrl] = useState<string | null>(() => resolveLocalUrl(src));
  const [error, setError] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    // Always clear the error flag when the source changes.
    setError(false);

    if (!src) {
      setDataUrl(null);
      setIsLoadingPdf(false);
      return;
    }

    // ── Local blob / data URL ─────────────────────────────────────────────
    // Resolve synchronously; no fetch or PDF decode needed.
    if (src.startsWith("blob:") || src.startsWith("data:")) {
      setDataUrl(src);
      setIsLoadingPdf(false);
      return;
    }

    const resolvedUrl = src.startsWith("/") ? `${BACKEND_URL.replace(/\/$/, "")}${src}` : src;

    // ── PDF ───────────────────────────────────────────────────────────────
    const isPdf =
      mimeType === "application/pdf" || src.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      let isCancelled = false;
      setIsLoadingPdf(true);

      const loadPdfPreview = async () => {
        try {
          const isAsset = src.startsWith("/api/assets/") || src.includes("/api/assets/");
          const res = isAsset ? await fetch(resolvedUrl) : await backendFetch(src);
          if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
          const blob = await res.blob();
          if (isCancelled) return;
          const arrayBuffer = await blob.arrayBuffer();
          if (isCancelled) return;

          const result = await renderPdfBufferToDataUrl(arrayBuffer, 1.0, "image/webp", 0.9);
          if (!isCancelled) {
            setDataUrl(result.dataUrl);
          }
        } catch (e) {
          console.error("Failed to render PDF preview", e);
          if (!isCancelled) setError(true);
        } finally {
          if (!isCancelled) setIsLoadingPdf(false);
        }
      };

      loadPdfPreview();
      return () => {
        isCancelled = true;
      };
    }

    // ── Remote image URL ──────────────────────────────────────────────────
    // Asset content URLs are public, so the browser can render them directly.
    setDataUrl(resolvedUrl);
    setIsLoadingPdf(false);
  }, [src, mimeType]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted ${className}`}>
        {fallback || <Package className="w-5 h-5" />}
      </div>
    );
  }

  if (isLoadingPdf && !dataUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-ui-bg-subtle text-ui-fg-muted animate-pulse ${className}`}>
        <FileText className="w-5 h-5 mb-1" />
        <span className="text-[10px]">Loading PDF...</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted animate-pulse ${className}`}>
        {fallback || <Package className="w-5 h-5" />}
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
