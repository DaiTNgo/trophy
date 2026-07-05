import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { normalizeContentUrl } from "../../lib/product-assets-client";
import { backendFetch } from "../../lib/fetch";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker?url";
import { Package, FileText } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export type AdminMediaProps = {
  src?: string;
  mimeType?: string;
  className?: string;
  fallback?: React.ReactNode;
  alt?: string;
};

export function AdminMedia({ src, mimeType, className = "", fallback, alt = "Media" }: AdminMediaProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    if (!src) {
      setDataUrl(null);
      setError(false);
      setIsLoadingPdf(false);
      return;
    }

    const isPdf = (mimeType === "application/pdf" || src.toLowerCase().endsWith(".pdf")) && !src.startsWith("data:image/");

    if (isPdf) {
      let isCancelled = false;
      setIsLoadingPdf(true);
      setError(false);

      const loadPdfPreview = async () => {
        try {
          const fullUrl = normalizeContentUrl(src);
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
    } else {
      if (src.startsWith("blob:") || src.startsWith("data:")) {
        setDataUrl(src);
        setError(false);
        setIsLoadingPdf(false);
        return;
      }

      setDataUrl(normalizeContentUrl(src));
      setError(false);
      setIsLoadingPdf(false);
      return;
    }
  }, [src, mimeType]);

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

  return (
    <img
      src={dataUrl!}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
