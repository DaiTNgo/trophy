import { useState, useRef, useEffect } from "react";
import {
  Button,
  FocusModal,
  Heading,
  Label,
  Text,
  IconButton,
  ProgressTabs,
} from "@medusajs/ui";
import { useNavigate } from "react-router";
import { backendFetch } from "../../../lib/fetch";
import { uploadProductVariantMedia } from "../../../lib/product-assets-client";
import { AdminMedia } from "../../../components/ui/admin-media";
import {
  LocalizedTextField,
  createEmptyLocalizedText,
  type AdminLocale,
  type LocalizedTextValue,
} from "../../../components/ui/medusa";
import { convertPdfToImageFile } from "../../../lib/pdf-preview";
import { Upload, Trash } from "lucide-react";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCollectionModal({ open, onOpenChange, onSuccess }: CreateCollectionModalProps) {
  const [title, setTitle] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [handle, setHandle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTitle(createEmptyLocalizedText());
      setTitleLocale("vi");
      setHandle("");
      setFile(null);
      setPreviewUrl("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      let finalFile = selectedFile;
      if (selectedFile.type === "application/pdf") {
        finalFile = await convertPdfToImageFile(selectedFile);
      }
      setFile(finalFile);
      setPreviewUrl(URL.createObjectURL(finalFile));
    } catch (err) {
      console.error("Failed to process file:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl("");
  };

  const handleSave = async () => {
    const vietnameseTitle = title.vi.trim();

    if (!vietnameseTitle) return;
    setIsSaving(true);
    try {
      let finalImageUrl = null;
      if (file) {
        const media = await uploadProductVariantMedia(file);
        finalImageUrl = media.contentUrl;
      }

      const res = await backendFetch("/api/admin/product-metadata/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: vietnameseTitle,
          handle: handle || undefined,
          imageUrl: finalImageUrl || undefined
        })
      });

      if (!res.ok) throw new Error("Failed to create collection");
      const { item } = await res.json();
      
      onSuccess();
      onOpenChange(false);
      navigate(`/collections/${item.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = title.vi.trim().length > 0;

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <ProgressTabs
          value="1"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FocusModal.Header>
            <ProgressTabs.List className="-my-2 w-full border-l">
              <ProgressTabs.Trigger
                value="1"
                status="in-progress"
              >
                Details
              </ProgressTabs.Trigger>
            </ProgressTabs.List>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col h-full">
            <ProgressTabs.Content value="1" className="outline-none h-full">
              <div className="flex-1 flex flex-col items-center pt-16">
                <div className="w-full max-w-[720px] flex flex-col gap-y-8 px-8 pb-16">
              <div className="flex flex-col gap-y-1">
                <Heading level="h1">Create Collection</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Create a new collection to organize your products.
                </Text>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <LocalizedTextField
                  id="collection-title"
                  label="Title"
                  value={title}
                  locale={titleLocale}
                  onLocaleChange={setTitleLocale}
                  onChange={setTitle}
                  placeholder={{
                    vi: "Bo suu tap cup vo dich",
                    en: "Championship trophy collection",
                  }}
                />
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="handle" weight="plus" className="flex items-center gap-x-1">
                    Handle <span className="text-ui-fg-muted font-normal">(Optional)</span>
                  </Label>
                  <div className="flex shadow-borders-base rounded-md overflow-hidden bg-ui-bg-field">
                    <div className="px-3 py-1.5 border-r border-ui-border-base flex items-center justify-center bg-ui-bg-subtle">
                      <Text size="small" className="text-ui-fg-muted">/</Text>
                    </div>
                    <input
                      id="handle"
                      className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-y-4">
                <div className="flex items-center justify-between">
                  <Heading level="h2" className="text-xl font-semibold">Media</Heading>
                </div>
                {previewUrl ? (
                  <div className="relative aspect-[4/3] w-[400px] max-w-full rounded-lg overflow-hidden bg-ui-bg-subtle border border-ui-border-base group">
                    <AdminMedia src={previewUrl} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton size="small" variant="transparent" onClick={handleRemoveImage}>
                        <Trash className="h-4 w-4 text-ui-fg-muted" />
                      </IconButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-x-4">
                    <div className="h-24 w-24 rounded-lg border border-ui-border-base border-dashed flex items-center justify-center bg-ui-bg-subtle">
                      <Upload className="h-6 w-6 text-ui-fg-muted" />
                    </div>
                    <div className="flex flex-col gap-y-1">
                      <Text size="small" className="font-medium">Upload Image</Text>
                      <Text size="small" className="text-ui-fg-subtle">PNG, JPG, WEBP up to 5MB</Text>
                      <div className="mt-2">
                        <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()}>
                          Choose file
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
              </div>
            </ProgressTabs.Content>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            <Button onClick={handleSave} isLoading={isSaving} disabled={!canSave}>
              Save
            </Button>
          </div>
          </FocusModal.Footer>
        </ProgressTabs>
      </FocusModal.Content>
    </FocusModal>
  );
}
