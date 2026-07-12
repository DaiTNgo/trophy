import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Container, FocusModal, Heading, Input, Label, Table, Text } from "@medusajs/ui";
import { CheckCircle, Plus, Search, XCircle } from "lucide-react";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { type BrandFont, useBrandAssets } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

// ─── Add Font Modal ───────────────────────────────────────────────────────────

function AddFontModal({
  open,
  onOpenChange,
  existingFonts,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFonts: BrandFont[];
  onSuccess: () => void;
}) {
  const [fontName, setFontName] = useState("");
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [boldItalicFile, setBoldItalicFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFontName("");
      setRegularFile(null);
      setBoldFile(null);
      setItalicFile(null);
      setBoldItalicFile(null);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSave() {
    if (!fontName) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const id = createSlug(fontName);
      if (!id) throw new Error("Invalid font name");
      if (existingFonts.some((f) => f.id === id)) {
        throw new Error(`A font family with the name "${fontName}" already exists.`);
      }

      const uploadFile = async (file: File | null) => {
        if (!file) return null;
        const res = await backendFetch("/api/admin/brand-assets/fonts/upload", {
          method: "POST",
          headers: { "Content-Type": file.type || "font/ttf" },
          body: file,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Failed to upload ${file.name}`);
        }
        return (await res.json()).assetId as string;
      };

      const [regularAssetId, boldAssetId, italicAssetId, boldItalicAssetId] = await Promise.all([
        uploadFile(regularFile),
        uploadFile(boldFile),
        uploadFile(italicFile),
        uploadFile(boldItalicFile),
      ]);

      const res = await backendFetch("/api/admin/brand-assets/fonts", {
        method: "POST",
        body: JSON.stringify({
          id,
          name: fontName.trim(),
          regularAssetId,
          boldAssetId,
          italicAssetId,
          boldItalicAssetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create font family");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = [regularFile, boldFile, italicFile, boldItalicFile].filter(Boolean).length;

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Add font family</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Upload one or more TTF variants — at least Regular is recommended.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="font-name">Family Name</Label>
              <Input
                id="font-name"
                placeholder="e.g. Roboto Slab"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  { id: "font-regular", label: "Regular TTF", onChange: setRegularFile },
                  { id: "font-bold", label: "Bold TTF", onChange: setBoldFile },
                  { id: "font-italic", label: "Italic TTF", onChange: setItalicFile },
                  { id: "font-bold-italic", label: "Bold Italic TTF", onChange: setBoldItalicFile },
                ] as const
              ).map(({ id, label, onChange }) => (
                <div key={id} className="flex flex-col gap-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    type="file"
                    accept=".ttf"
                    onChange={(e) => onChange(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
            {pendingCount > 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                {pendingCount} file{pendingCount > 1 ? "s" : ""} selected
              </Text>
            ) : null}
            {errorMessage ? (
              <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
                <Text size="small">{errorMessage}</Text>
              </div>
            ) : null}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            <Button onClick={handleSave} isLoading={isSubmitting} disabled={!fontName.trim() || isSubmitting}>
              Create family
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

// ─── Font Detail Modal ────────────────────────────────────────────────────────

type VariantKey = "regularAssetId" | "boldAssetId" | "italicAssetId" | "boldItalicAssetId";

const VARIANTS: { key: VariantKey; label: string; uploadParam: string }[] = [
  { key: "regularAssetId", label: "Regular", uploadParam: "regular" },
  { key: "boldAssetId", label: "Bold", uploadParam: "bold" },
  { key: "italicAssetId", label: "Italic", uploadParam: "italic" },
  { key: "boldItalicAssetId", label: "Bold Italic", uploadParam: "boldItalic" },
];

function FontDetailModal({
  font,
  onClose,
  onDeleted,
  onUpdated,
}: {
  font: BrandFont | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [uploadingKey, setUploadingKey] = useState<VariantKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!font) {
      setUploadingKey(null);
      setErrorMessage(null);
    }
  }, [font]);

  if (!font) return null;

  async function handleUploadVariant(key: VariantKey, file: File) {
    if (!font) return;
    setUploadingKey(key);
    setErrorMessage(null);
    try {
      const uploadRes = await backendFetch("/api/admin/brand-assets/fonts/upload", {
        method: "POST",
        headers: { "Content-Type": file.type || "font/ttf" },
        body: file,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }
      const { assetId } = await uploadRes.json();

      const patchRes = await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [key]: assetId }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to save variant");
      }
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload variant");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleRemoveVariant(key: VariantKey) {
    if (!font) return;
    setUploadingKey(key);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [key]: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to remove variant");
      }
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove variant");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleDelete() {
    if (!font) return;
    setErrorMessage(null);
    try {
      await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, { method: "DELETE" });
      onDeleted();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete font");
    }
  }

  return (
    <FocusModal open={!!font} onOpenChange={(open) => { if (!open) onClose(); }}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">{font.name}</Heading>
            <Text size="small" className="text-ui-fg-subtle font-mono">
              {font.id}
            </Text>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
            <div className="flex flex-col gap-1">
              <Heading level="h3" className="text-base font-medium">Variants</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Upload a TTF file to add or replace a variant. Remove to unlink without deleting the asset.
              </Text>
            </div>

            <div className="flex flex-col gap-3">
              {VARIANTS.map(({ key, label }) => {
                const hasFile = !!font[key];
                const busy = uploadingKey === key;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3"
                  >
                    {/* Status icon */}
                    {hasFile ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-ui-fg-positive" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-ui-fg-muted" />
                    )}

                    {/* Label */}
                    <Text size="small" weight="plus" className="w-24 shrink-0">
                      {label}
                    </Text>

                    {/* Status badge */}
                    <Badge color={hasFile ? "green" : "grey"} className="shrink-0">
                      {hasFile ? "Uploaded" : "Missing"}
                    </Badge>

                    {/* Actions — pushed right */}
                    <div className="ml-auto flex items-center gap-2">
                      {/* Replace / upload */}
                      <label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                        <input
                          type="file"
                          accept=".ttf"
                          className="sr-only"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadVariant(key, file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="small"
                          isLoading={busy}
                          disabled={busy}
                          asChild
                        >
                          <span>{hasFile ? "Replace" : "Upload"}</span>
                        </Button>
                      </label>

                      {/* Remove */}
                      {hasFile ? (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleRemoveVariant(key)}
                          disabled={busy}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
                <Text size="small">{errorMessage}</Text>
              </div>
            ) : null}

            {/* Danger zone */}
            <div className="border-t border-ui-border-base pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="small" weight="plus">Delete font family</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    Permanently removes this family and unlinks all variants.
                  </Text>
                </div>
                <Button variant="danger" size="small" onClick={handleDelete}>
                  Delete family
                </Button>
              </div>
            </div>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button variant="secondary">Close</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandFontsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { fonts } = useBrandAssets(refreshKey);
  const { setBreadcrumbs } = useBreadcrumbs();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<BrandFont | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Fonts", path: "/customization/fonts" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function reload() {
    setRefreshKey((k) => k + 1);
  }

  // After an update, refresh data and keep the modal open with fresh data
  async function handleUpdated() {
    setRefreshKey((k) => k + 1);
  }

  // After delete, close modal and refresh
  function handleDeleted() {
    setSelectedFont(null);
    setRefreshKey((k) => k + 1);
  }

  // Keep selectedFont in sync with fresh data after an update
  useEffect(() => {
    if (selectedFont) {
      const fresh = fonts.find((f) => f.id === selectedFont.id);
      if (fresh) setSelectedFont(fresh);
    }
  }, [fonts]);

  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) => f.name.toLowerCase().includes(q));
  }, [fonts, search]);

  return (
    <>
      <Container className="overflow-hidden p-0">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b border-ui-border-base px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2" className="text-xl font-semibold">
                  Fonts
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Font families available in the customization editor. Click a row to manage variants.
                </Text>
              </div>
              <Button variant="secondary" size="small" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add font family
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-end border-b border-ui-border-base px-6 py-3">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="search"
                placeholder="Search fonts"
                className="w-[220px] pl-8"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="pl-6">Name</Table.HeaderCell>
                  <Table.HeaderCell>ID</Table.HeaderCell>
                  <Table.HeaderCell>Variants</Table.HeaderCell>
                  <Table.HeaderCell>Uploaded files</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredFonts.length === 0 ? (
                  <Table.Row>
                    <Table.Cell {...({ colSpan: 4 } as any)} className="py-8 text-center text-ui-fg-muted">
                      {fonts.length === 0
                        ? "No font families yet. Add one to get started."
                        : "No fonts match this search."}
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredFonts.map((font) => (
                    <Table.Row
                      key={font.id}
                      className="cursor-pointer hover:bg-ui-bg-base-hover"
                      onClick={() => setSelectedFont(font)}
                    >
                      <Table.Cell className="pl-6 font-medium">{font.name}</Table.Cell>
                      <Table.Cell className="text-ui-fg-subtle font-mono text-xs">{font.id}</Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1.5 flex-wrap">
                          {VARIANTS.map(({ key, label }) => (
                            <Badge key={key} color={font[key] ? "green" : "grey"}>
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color="grey">{fontVariantCount(font)} / 4</Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
      </Container>

      <AddFontModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        existingFonts={fonts}
        onSuccess={reload}
      />

      <FontDetailModal
        font={selectedFont}
        onClose={() => setSelectedFont(null)}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
      />
    </>
  );
}
