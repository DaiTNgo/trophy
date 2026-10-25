import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { validateCategoryOrCollectionMediaFile } from "../lib/media-asset";
import { uploadProductVariantMedia } from "../lib/product-assets-client";

function revokeBlobUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * Local state for a single category/collection image: a picked file previewed via a blob URL,
 * or the URL of the image already saved on the server.
 */
export function useImageUploadField() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => revokeBlobUrl(previewUrl), [previewUrl]);

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    const validationError = validateCategoryOrCollectionMediaFile(selectedFile);
    if (validationError) {
      setError(validationError);
      clearInput();
      return;
    }

    try {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } catch (err) {
      console.error("Failed to load file preview", err);
      setError(err instanceof Error ? err.message : "Failed to load file preview.");
    } finally {
      clearInput();
    }
  };

  /** Shows `savedUrl` (or nothing) and drops any picked file. */
  const reset = useCallback((savedUrl = "") => {
    setFile(null);
    setPreviewUrl(savedUrl);
    setError(null);
  }, []);

  const openPicker = () => inputRef.current?.click();

  /** Uploads the picked file if there is one; otherwise returns the saved URL ("" when removed). */
  const resolveImageUrl = async () => {
    if (!file) return previewUrl;
    const media = await uploadProductVariantMedia(file);
    return media.contentUrl;
  };

  return {
    file,
    previewUrl,
    error,
    setError,
    inputRef,
    handleFileChange,
    remove: () => reset(),
    reset,
    openPicker,
    resolveImageUrl,
  };
}

export type ImageUploadField = ReturnType<typeof useImageUploadField>;
