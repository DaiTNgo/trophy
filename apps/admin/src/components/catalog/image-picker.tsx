import { Button, Container, Heading, Text } from "@medusajs/ui";
import { Upload, X } from "lucide-react";
import type { ImageUploadField } from "../../hooks/use-image-upload-field";
import { ACCEPT_IMAGE_MIME_TYPES, SUPPORTED_IMAGE_TYPES_HINT } from "../../lib/media-asset";
import { MediaPreview } from "../ui/media-preview";

export function ImageUploadError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
      <Text size="small" className="text-ui-fg-error">
        {message}
      </Text>
    </div>
  );
}

/** Square image preview with a remove button, or an upload placeholder, plus the hidden file input. */
export function ImagePicker({ field, alt }: { field: ImageUploadField; alt: string }) {
  return (
    <>
      {field.previewUrl ? (
        <div className="relative h-48 w-48 overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle">
          <MediaPreview
            src={field.previewUrl}
            mimeType={field.file?.type || "image/jpeg"}
            className="h-full w-full object-cover"
            alt={alt}
          />
          <button
            type="button"
            onClick={field.remove}
            className="absolute right-2 top-2 rounded-full bg-ui-bg-overlay p-1 text-ui-fg-on-color shadow transition hover:bg-ui-bg-overlay-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={field.openPicker}
          className="flex h-48 w-48 flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted transition hover:border-ui-border-strong hover:text-ui-fg-base"
        >
          <Upload className="h-6 w-6" />
          <Text size="small">Upload Image</Text>
        </button>
      )}
      <input
        ref={field.inputRef}
        type="file"
        accept={ACCEPT_IMAGE_MIME_TYPES}
        className="hidden"
        onChange={field.handleFileChange}
      />
      <ImageUploadError message={field.error} />
    </>
  );
}

/** "Media" side card on category/collection detail pages. */
export function MediaCard({
  field,
  alt,
  isSaving,
  onSave,
}: {
  field: ImageUploadField;
  alt: string;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <Container className="p-0 overflow-hidden w-full lg:w-[320px] h-fit">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            <Heading level="h2" className="text-xl font-semibold">
              Media
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {SUPPORTED_IMAGE_TYPES_HINT}
            </Text>
          </div>
        </div>
        <div className="flex flex-col gap-y-4 border-t border-ui-border-base px-6 py-4">
          <ImagePicker field={field} alt={alt} />
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onClick={field.openPicker}>
              {field.previewUrl ? "Replace" : "Upload"}
            </Button>
            <Button size="small" onClick={onSave} isLoading={isSaving}>
              Save Media
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
