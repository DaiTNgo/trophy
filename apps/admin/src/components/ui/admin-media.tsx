import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { backendFetch } from "../../lib/fetch";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker?url";
import { Package, FileText } from "lucide-react";
import { shouldLoadMediaViaBlob } from "../../lib/admin-media";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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

    // ── PDF ───────────────────────────────────────────────────────────────
    const isPdf =
      mimeType === "application/pdf" || src.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      let isCancelled = false;
      setIsLoadingPdf(true);

      const loadPdfPreview = async () => {
        try {
          const fullUrl = src;
          const res = await backendFetch(fullUrl);
          if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
          const blob = await res.blob();
          if (isCancelled) return;
          const arrayBuffer = await blob.arrayBuffer();
          if (isCancelled) return;

          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDocument = await loadingTask.promise;
          if (isCancelled) return;

          if (pdfDocument.numPages > 0) {
            const page = await pdfDocument.getPage(1);
            if (isCancelled) return;

            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");

            if (ctx) {
              await page.render({ canvasContext: ctx, viewport } as any).promise;
              if (!isCancelled) {
                setDataUrl(canvas.toDataURL("image/webp", 0.9));
              }
            }
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

    // ── Remote URL that needs a credentialed fetch ────────────────────────
    // (WebP and other binary assets served by the backend.)
    const shouldFetchViaCors = shouldLoadMediaViaBlob(src, mimeType);

    if (shouldFetchViaCors) {
      let isCancelled = false;
      let objectUrl: string | null = null;

      setIsLoadingPdf(false);

      const loadImageBlob = async () => {
        try {
          const fullUrl = src;
          const res = await backendFetch(fullUrl);
          if (!res.ok) throw new Error(`Failed to fetch media: ${res.status}`);
          const blob = await res.blob();
          if (isCancelled) return;

          objectUrl = URL.createObjectURL(blob);
          setDataUrl(objectUrl);
        } catch (e) {
          console.error("Failed to load media preview", e);
          if (!isCancelled) setError(true);
        }
      };

      loadImageBlob();
      return () => {
        isCancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    // ── Plain remote URL (SVG, PNG served without CORS issues) ────────────
    setDataUrl(src);
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
      onError={() => setError(true)}
    />
  );
}
