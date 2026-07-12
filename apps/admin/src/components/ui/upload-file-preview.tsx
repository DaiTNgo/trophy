import { useEffect, useState } from "react";
import { Package } from "lucide-react";

export type UploadFilePreviewProps = {
  /** The raw File object staged for upload. */
  file: File;
  alt?: string;
  className?: string;
};

/**
 * Lightweight preview for a File that has been staged for upload.
 *
 * Owns the blob URL lifecycle — creates it on mount / file change and revokes
 * it on cleanup so there are no dangling object URLs.  Renders the image on
 * the very first paint (no intermediate null state) for all types the browser
 * can display natively: WebP, PNG, SVG, JPEG.
 */
export function UploadFilePreview({ file, alt = "Preview", className = "" }: UploadFilePreviewProps) {
  const [src, setSrc] = useState<string>(() => URL.createObjectURL(file));
  const [error, setError] = useState(false);

  useEffect(() => {
    // When the file changes, create a new blob URL and revoke the old one.
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    setError(false);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-ui-bg-subtle text-ui-fg-muted ${className}`}>
        <Package className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
