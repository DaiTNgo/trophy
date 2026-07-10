import { Button, Input, Label, Text } from "@medusajs/ui";
import { Upload, X } from "lucide-react";
import { useMemo } from "react";
import { UploadFilePreview } from "../ui/upload-file-preview";
import {
  type UploadDraft,
  buildUploadDraftErrors,
  clipartNameFromFile,
  inferClipartMimeType,
} from "../../lib/clipart-utils";

export type ClipartUploadQueueProps = {
  uploadDrafts: UploadDraft[];
  setUploadDrafts: React.Dispatch<React.SetStateAction<UploadDraft[]>>;
  isUploading: boolean;
  categoryActive: boolean;
  showActionButtons?: boolean;
  onUpload?: () => void;
  uploadButtonText?: string;
};

export function ClipartUploadQueue({
  uploadDrafts,
  setUploadDrafts,
  isUploading,
  categoryActive,
  showActionButtons = true,
  onUpload,
  uploadButtonText = "Upload media",
}: ClipartUploadQueueProps) {
  const uploadDraftErrors = useMemo(() => buildUploadDraftErrors(uploadDrafts), [uploadDrafts]);
  const hasUploadDraftErrors = uploadDraftErrors.some((errors) => errors.length > 0);

  function appendUploadDrafts(nextFiles: File[]) {
    const nextDrafts = nextFiles.map((file) => {
      const mimeType = inferClipartMimeType(file);
      const normalizedFile =
        mimeType && mimeType !== file.type
          ? new File([file], file.name, {
              type: mimeType,
              lastModified: file.lastModified,
            })
          : file;

      return {
        file: normalizedFile,
        name: clipartNameFromFile(file.name),
        mimeType,
      };
    });

    setUploadDrafts((current) => [...current, ...nextDrafts]);
  }

  function removeUploadDraft(index: number) {
    setUploadDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="file"
        multiple
        accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
        onChange={(event) => {
          appendUploadDrafts(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
        disabled={isUploading || !categoryActive}
      />
      {!categoryActive ? (
        <Text size="small" className="text-ui-fg-subtle">
          Reactivate this category before uploading new clipart media.
        </Text>
      ) : null}
      {uploadDrafts.length ? (
        <div className="grid gap-3">
          {uploadDrafts.map((draft, index) => (
            <div
              key={`${draft.file.name}-${draft.file.lastModified}-${index}`}
              className="grid gap-3 rounded-md border border-ui-border-base p-3 md:grid-cols-[88px_minmax(0,1fr)_auto]"
            >
              <UploadFilePreview
                file={draft.file}
                alt={draft.name || draft.file.name}
                className="h-20 w-20 rounded border border-ui-border-base bg-white object-contain"
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Filename
                  </Text>
                  <Text size="small" className="truncate" title={draft.file.name}>
                    {draft.file.name}
                  </Text>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(event) =>
                      setUploadDrafts((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={isUploading}
                  />
                </div>
                {uploadDraftErrors[index]?.length ? (
                  <div className="flex flex-col gap-1">
                    {uploadDraftErrors[index].map((error) => (
                      <Text key={error} size="xsmall" className="text-ui-fg-error">
                        {error}
                      </Text>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-start justify-end">
                <Button variant="secondary" size="small" onClick={() => removeUploadDraft(index)} disabled={isUploading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Text size="small" className="text-ui-fg-subtle">
          No files queued yet.
        </Text>
      )}
      {showActionButtons ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setUploadDrafts([])}
            disabled={uploadDrafts.length === 0 || isUploading}
          >
            Clear queue
          </Button>
          <Button
            onClick={onUpload}
            isLoading={isUploading}
            disabled={isUploading || uploadDrafts.length === 0 || hasUploadDraftErrors || !categoryActive}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadButtonText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
