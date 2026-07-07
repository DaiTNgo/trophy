import { useMemo, useState } from "react";
import { Badge, Button, Container, Heading, Input, Label, Table, Tabs, Text, Textarea } from "@medusajs/ui";
import { PenSquare, Plus, Trash2 } from "lucide-react";
import { AdminMedia } from "../components/ui/admin-media";
import {
  type BrandColor,
  type BrandFont,
  type BrandIconAsset,
  useBrandAssets,
} from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

type IconFormState = {
  name: string;
  categoryId: string;
  categoryLabel: string;
  tags: string;
  file: File | null;
};

type IconEditState = {
  id: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  tags: string;
};

const emptyIconForm = (): IconFormState => ({
  name: "",
  categoryId: "",
  categoryLabel: "",
  tags: "",
  file: null,
});

function formatFileType(mimeType: string) {
  if (mimeType === "image/svg+xml") return "SVG";
  if (mimeType === "image/webp") return "WebP";
  return "PNG";
}

function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

export function BrandAssetsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { colors, fonts, icons, isLoading } = useBrandAssets(refreshKey);

  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const [fontName, setFontName] = useState("");
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [boldItalicFile, setBoldItalicFile] = useState<File | null>(null);

  const [iconForm, setIconForm] = useState<IconFormState>(emptyIconForm);
  const [editingIcon, setEditingIcon] = useState<IconEditState | null>(null);
  const [isSubmittingColor, setIsSubmittingColor] = useState(false);
  const [isSubmittingFont, setIsSubmittingFont] = useState(false);
  const [isSubmittingIcon, setIsSubmittingIcon] = useState(false);
  const [iconActionId, setIconActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeIcons = useMemo(() => icons.filter((icon) => icon.active), [icons]);
  const inactiveIcons = useMemo(() => icons.filter((icon) => !icon.active), [icons]);

  async function reload() {
    setRefreshKey((value) => value + 1);
  }

  async function handleAddColor() {
    if (!colorName || !colorHex) return;
    setIsSubmittingColor(true);
    setErrorMessage(null);

    try {
      const generatedColorId = createSlug(colorName);
      if (!generatedColorId) throw new Error("Invalid color name");
      if (colors.some((color) => color.id === generatedColorId)) {
        throw new Error(`A color with the name "${colorName}" already exists.`);
      }

      const res = await backendFetch("/api/admin/brand-assets/colors", {
        method: "POST",
        body: JSON.stringify({ id: generatedColorId, name: colorName.trim(), hexCode: colorHex }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add color");
      }

      setColorName("");
      setColorHex("#000000");
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add color");
    } finally {
      setIsSubmittingColor(false);
    }
  }

  async function handleDeleteColor(id: string) {
    setErrorMessage(null);
    await backendFetch(`/api/admin/brand-assets/colors/${id}`, { method: "DELETE" });
    await reload();
  }

  async function handleAddFont() {
    if (!fontName) return;
    setIsSubmittingFont(true);
    setErrorMessage(null);

    try {
      const generatedFontId = createSlug(fontName);
      if (!generatedFontId) throw new Error("Invalid font name");
      if (fonts.some((font) => font.id === generatedFontId)) {
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
        const data = await res.json();
        return data.assetId as string;
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
          id: generatedFontId,
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

      setFontName("");
      setRegularFile(null);
      setBoldFile(null);
      setItalicFile(null);
      setBoldItalicFile(null);
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsSubmittingFont(false);
    }
  }

  async function handleDeleteFont(id: string) {
    setErrorMessage(null);
    await backendFetch(`/api/admin/brand-assets/fonts/${id}`, { method: "DELETE" });
    await reload();
  }

  async function handleCreateIcon() {
    if (!iconForm.name.trim() || !iconForm.file) return;
    setIsSubmittingIcon(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("name", iconForm.name.trim());
      if (iconForm.categoryId.trim()) formData.set("categoryId", iconForm.categoryId.trim());
      if (iconForm.categoryLabel.trim()) formData.set("categoryLabel", iconForm.categoryLabel.trim());
      if (iconForm.tags.trim()) formData.set("tags", iconForm.tags.trim());
      formData.set("file", iconForm.file);

      const res = await backendFetch("/api/admin/brand-assets/icons", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to upload icon");
      }

      setIconForm(emptyIconForm());
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload icon");
    } finally {
      setIsSubmittingIcon(false);
    }
  }

  function beginEditIcon(icon: BrandIconAsset) {
    setEditingIcon({
      id: icon.id,
      name: icon.name,
      categoryId: icon.categoryId ?? "",
      categoryLabel: icon.categoryLabel ?? "",
      tags: icon.tags.join(", "),
    });
  }

  async function handleSaveIconEdit() {
    if (!editingIcon) return;
    setIconActionId(editingIcon.id);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/brand-assets/icons/${editingIcon.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingIcon.name.trim(),
          categoryId: editingIcon.categoryId.trim() || null,
          categoryLabel: editingIcon.categoryLabel.trim() || null,
          tags: editingIcon.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update icon");
      }

      setEditingIcon(null);
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update icon");
    } finally {
      setIconActionId(null);
    }
  }

  async function handleDeactivateIcon(id: string) {
    setIconActionId(id);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/brand-assets/icons/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to deactivate icon");
      }
      if (editingIcon?.id === id) {
        setEditingIcon(null);
      }
      await reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to deactivate icon");
    } finally {
      setIconActionId(null);
    }
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level="h1">Brand Assets</Heading>
        <Text className="text-ui-fg-subtle">
          Manage global colors, fonts, and approved icon assets used across customization authoring.
        </Text>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
          <Text size="small">{errorMessage}</Text>
        </div>
      ) : null}

      <Tabs defaultValue="icons">
        <Tabs.List>
          <Tabs.Trigger value="icons">Icons</Tabs.Trigger>
          <Tabs.Trigger value="colors">Colors</Tabs.Trigger>
          <Tabs.Trigger value="fonts">Fonts</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="icons" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Heading level="h3">Upload icon asset</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      SVG is preferred for production output. PNG and WebP remain available for curated raster artwork.
                    </Text>
                  </div>
                  <Badge color="grey">Admin library</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. Championship Shield"
                      value={iconForm.name}
                      onChange={(event) => setIconForm((current) => ({ ...current, name: event.target.value }))}
                      disabled={isSubmittingIcon}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>File</Label>
                    <Input
                      type="file"
                      accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                      onChange={(event) =>
                        setIconForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                      }
                      disabled={isSubmittingIcon}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Category ID</Label>
                    <Input
                      placeholder="e.g. sports"
                      value={iconForm.categoryId}
                      onChange={(event) => setIconForm((current) => ({ ...current, categoryId: event.target.value }))}
                      disabled={isSubmittingIcon}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Category Label</Label>
                    <Input
                      placeholder="e.g. Sports"
                      value={iconForm.categoryLabel}
                      onChange={(event) => setIconForm((current) => ({ ...current, categoryLabel: event.target.value }))}
                      disabled={isSubmittingIcon}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Tags</Label>
                  <Textarea
                    placeholder="football, shield, varsity"
                    value={iconForm.tags}
                    onChange={(event) => setIconForm((current) => ({ ...current, tags: event.target.value }))}
                    disabled={isSubmittingIcon}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateIcon}
                    isLoading={isSubmittingIcon}
                    disabled={isSubmittingIcon || !iconForm.name.trim() || !iconForm.file}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Icon
                  </Button>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Heading level="h3">Active icons</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      These are available to product-layer allowlists.
                    </Text>
                  </div>
                  <Badge color="green">{activeIcons.length}</Badge>
                </div>

                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Preview</Table.HeaderCell>
                      <Table.HeaderCell>Name</Table.HeaderCell>
                      <Table.HeaderCell>Category</Table.HeaderCell>
                      <Table.HeaderCell>Tags</Table.HeaderCell>
                      <Table.HeaderCell>Type</Table.HeaderCell>
                      <Table.HeaderCell>Source</Table.HeaderCell>
                      <Table.HeaderCell></Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {activeIcons.map((icon) => (
                      <Table.Row key={icon.id}>
                        <Table.Cell>
                          <AdminMedia
                            src={icon.previewUrl}
                            mimeType={icon.mimeType}
                            alt={icon.name}
                            className="h-12 w-12 rounded border border-ui-border-base bg-white object-contain"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col gap-1">
                            <Text size="small" weight="plus">{icon.name}</Text>
                            <Text size="xsmall" className="text-ui-fg-subtle">{icon.id}</Text>
                          </div>
                        </Table.Cell>
                        <Table.Cell>{icon.categoryLabel || icon.categoryId || "Uncategorized"}</Table.Cell>
                        <Table.Cell className="max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {icon.tags.length ? icon.tags.map((tag) => (
                              <Badge key={tag} color="grey">{tag}</Badge>
                            )) : <Text size="xsmall" className="text-ui-fg-subtle">No tags</Text>}
                          </div>
                        </Table.Cell>
                        <Table.Cell>{formatFileType(icon.mimeType)}</Table.Cell>
                        <Table.Cell>
                          {icon.sourceWidthPx && icon.sourceHeightPx
                            ? `${icon.sourceWidthPx}x${icon.sourceHeightPx}`
                            : "Unknown"}
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="small" onClick={() => beginEditIcon(icon)}>
                              <PenSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              isLoading={iconActionId === icon.id}
                              onClick={() => handleDeactivateIcon(icon.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                    {!activeIcons.length && !isLoading ? (
                      <Table.Row>
                        <Table.Cell className="py-8 text-center text-ui-fg-subtle">
                          No active icons uploaded yet.
                        </Table.Cell>
                      </Table.Row>
                    ) : null}
                  </Table.Body>
                </Table>
              </section>

              {!!inactiveIcons.length && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Heading level="h3">Inactive icons</Heading>
                    <Badge color="orange">{inactiveIcons.length}</Badge>
                  </div>
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell>Category</Table.HeaderCell>
                        <Table.HeaderCell>Type</Table.HeaderCell>
                        <Table.HeaderCell>State</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {inactiveIcons.map((icon) => (
                        <Table.Row key={icon.id}>
                          <Table.Cell>{icon.name}</Table.Cell>
                          <Table.Cell>{icon.categoryLabel || icon.categoryId || "Uncategorized"}</Table.Cell>
                          <Table.Cell>{formatFileType(icon.mimeType)}</Table.Cell>
                          <Table.Cell><Badge color="orange">Inactive</Badge></Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </section>
              )}
            </div>

            <aside className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
              <div className="flex flex-col gap-1">
                <Heading level="h3">Icon metadata</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Update naming, categories, and search tags without replacing the source file.
                </Text>
              </div>

              {editingIcon ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Name</Label>
                    <Input
                      value={editingIcon.name}
                      onChange={(event) => setEditingIcon((current) => current ? { ...current, name: event.target.value } : current)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Category ID</Label>
                    <Input
                      value={editingIcon.categoryId}
                      onChange={(event) => setEditingIcon((current) => current ? { ...current, categoryId: event.target.value } : current)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Category Label</Label>
                    <Input
                      value={editingIcon.categoryLabel}
                      onChange={(event) => setEditingIcon((current) => current ? { ...current, categoryLabel: event.target.value } : current)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Tags</Label>
                    <Textarea
                      rows={3}
                      value={editingIcon.tags}
                      onChange={(event) => setEditingIcon((current) => current ? { ...current, tags: event.target.value } : current)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="small" onClick={() => setEditingIcon(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      isLoading={iconActionId === editingIcon.id}
                      onClick={handleSaveIconEdit}
                      disabled={!editingIcon.name.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-base p-4">
                  <Text size="small" className="text-ui-fg-subtle text-center">
                    Select an active icon to edit its metadata.
                  </Text>
                </div>
              )}
            </aside>
          </div>
        </Tabs.Content>

        <Tabs.Content value="colors" className="flex flex-col gap-6 mt-4">
          <BrandColorsTab
            colors={colors}
            colorHex={colorHex}
            colorName={colorName}
            isSubmitting={isSubmittingColor}
            onChangeColorHex={setColorHex}
            onChangeColorName={setColorName}
            onCreate={handleAddColor}
            onDelete={handleDeleteColor}
          />
        </Tabs.Content>

        <Tabs.Content value="fonts" className="flex flex-col gap-6 mt-4">
          <BrandFontsTab
            fonts={fonts}
            fontName={fontName}
            regularFile={regularFile}
            boldFile={boldFile}
            italicFile={italicFile}
            boldItalicFile={boldItalicFile}
            isSubmitting={isSubmittingFont}
            onChangeFontName={setFontName}
            onChangeRegularFile={setRegularFile}
            onChangeBoldFile={setBoldFile}
            onChangeItalicFile={setItalicFile}
            onChangeBoldItalicFile={setBoldItalicFile}
            onCreate={handleAddFont}
            onDelete={handleDeleteFont}
          />
        </Tabs.Content>
      </Tabs>
    </Container>
  );
}

function BrandColorsTab({
  colors,
  colorName,
  colorHex,
  isSubmitting,
  onChangeColorName,
  onChangeColorHex,
  onCreate,
  onDelete,
}: {
  colors: BrandColor[];
  colorName: string;
  colorHex: string;
  isSubmitting: boolean;
  onChangeColorName: (value: string) => void;
  onChangeColorHex: (value: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
        <Heading level="h3">Add New Color</Heading>
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-2 flex-1">
            <Label>Name</Label>
            <Input placeholder="e.g. Primary Gold" value={colorName} onChange={(e) => onChangeColorName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <Label>Hex Code</Label>
            <div className="flex gap-2">
              <input type="color" value={colorHex} onChange={(e) => onChangeColorHex(e.target.value)} className="w-10 h-10 p-1 bg-white border border-ui-border-base rounded" />
              <Input value={colorHex} onChange={(e) => onChangeColorHex(e.target.value)} />
            </div>
          </div>
          <Button onClick={onCreate} isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-2" /> Add Color
          </Button>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Swatch</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Hex Code</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {colors.map((color) => (
            <Table.Row key={color.id}>
              <Table.Cell>
                <div className="w-6 h-6 rounded-full border border-ui-border-strong" style={{ backgroundColor: color.hexCode }} />
              </Table.Cell>
              <Table.Cell>{color.name}</Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{color.id}</Table.Cell>
              <Table.Cell className="font-mono text-ui-fg-subtle">{color.hexCode}</Table.Cell>
              <Table.Cell className="text-right">
                <Button variant="danger" size="small" onClick={() => onDelete(color.id)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </>
  );
}

function BrandFontsTab({
  fonts,
  fontName,
  regularFile,
  boldFile,
  italicFile,
  boldItalicFile,
  isSubmitting,
  onChangeFontName,
  onChangeRegularFile,
  onChangeBoldFile,
  onChangeItalicFile,
  onChangeBoldItalicFile,
  onCreate,
  onDelete,
}: {
  fonts: BrandFont[];
  fontName: string;
  regularFile: File | null;
  boldFile: File | null;
  italicFile: File | null;
  boldItalicFile: File | null;
  isSubmitting: boolean;
  onChangeFontName: (value: string) => void;
  onChangeRegularFile: (value: File | null) => void;
  onChangeBoldFile: (value: File | null) => void;
  onChangeItalicFile: (value: File | null) => void;
  onChangeBoldItalicFile: (value: File | null) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
        <Heading level="h3">Add Font Family</Heading>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Family Name</Label>
            <Input placeholder="e.g. Roboto Slab" value={fontName} onChange={(e) => onChangeFontName(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Regular TTF</Label>
              <Input type="file" accept=".ttf" onChange={(e) => onChangeRegularFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Bold TTF</Label>
              <Input type="file" accept=".ttf" onChange={(e) => onChangeBoldFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Italic TTF</Label>
              <Input type="file" accept=".ttf" onChange={(e) => onChangeItalicFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Bold Italic TTF</Label>
              <Input type="file" accept=".ttf" onChange={(e) => onChangeBoldItalicFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onCreate} isLoading={isSubmitting} disabled={isSubmitting || !fontName}>
              <Plus className="w-4 h-4 mr-2" /> Create Family
            </Button>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            Pending files: {[regularFile, boldFile, italicFile, boldItalicFile].filter(Boolean).length}
          </Text>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Variants Uploaded</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {fonts.map((font) => (
            <Table.Row key={font.id}>
              <Table.Cell className="font-medium">{font.name}</Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{font.id}</Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <Badge color="grey">{fontVariantCount(font)} files</Badge>
                  <Text size="small" className="text-ui-fg-subtle">
                    {font.regularAssetId ? "Regular" : ""}{font.boldAssetId ? " Bold" : ""}{font.italicAssetId ? " Italic" : ""}{font.boldItalicAssetId ? " Bold Italic" : ""}
                  </Text>
                </div>
              </Table.Cell>
              <Table.Cell className="text-right">
                <Button variant="danger" size="small" onClick={() => onDelete(font.id)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </>
  );
}
