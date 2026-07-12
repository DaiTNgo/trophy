import { useEffect, useState } from "react";
import { Badge, Button, Container, FocusModal, Heading, Input, Label, Table, Text } from "@medusajs/ui";
import { Plus, Search } from "lucide-react";
import { type BrandColor, type BrandFont, useBrandAssets } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

// ─── Add Color Modal ─────────────────────────────────────────────────────────

function AddColorModal({
  open,
  onOpenChange,
  existingColors,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingColors: BrandColor[];
  onSuccess: () => void;
}) {
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setColorName("");
      setColorHex("#000000");
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSave() {
    if (!colorName || !colorHex) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedColorId = createSlug(colorName);
      if (!generatedColorId) throw new Error("Invalid color name");
      if (existingColors.some((color) => color.id === generatedColorId)) {
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

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add color");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Add color</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Give the color a name and pick its hex value.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="color-name">Name</Label>
              <Input
                id="color-name"
                placeholder="e.g. Primary Gold"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="color-hex">Hex Code</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-10 h-10 p-1 bg-white border border-ui-border-base rounded cursor-pointer"
                  disabled={isSubmitting}
                />
                <Input
                  id="color-hex"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
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
            <Button
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={!colorName.trim() || isSubmitting}
            >
              Add color
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
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
      const generatedFontId = createSlug(fontName);
      if (!generatedFontId) throw new Error("Invalid font name");
      if (existingFonts.some((font) => font.id === generatedFontId)) {
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-regular">Regular TTF</Label>
                <Input
                  id="font-regular"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setRegularFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-bold">Bold TTF</Label>
                <Input
                  id="font-bold"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setBoldFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-italic">Italic TTF</Label>
                <Input
                  id="font-italic"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setItalicFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-bold-italic">Bold Italic TTF</Label>
                <Input
                  id="font-bold-italic"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setBoldItalicFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
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
            <Button
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={!fontName.trim() || isSubmitting}
            >
              Create family
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BrandAssetsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { colors, fonts } = useBrandAssets(refreshKey);

  const [isAddColorOpen, setIsAddColorOpen] = useState(false);
  const [isAddFontOpen, setIsAddFontOpen] = useState(false);

  const [colorSearch, setColorSearch] = useState("");
  const [fontSearch, setFontSearch] = useState("");

  async function reload() {
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteColor(id: string) {
    await backendFetch(`/api/admin/brand-assets/colors/${id}`, { method: "DELETE" });
    await reload();
  }

  async function handleDeleteFont(id: string) {
    await backendFetch(`/api/admin/brand-assets/fonts/${id}`, { method: "DELETE" });
    await reload();
  }

  const filteredColors = colorSearch.trim()
    ? colors.filter(
        (c) =>
          c.name.toLowerCase().includes(colorSearch.toLowerCase()) ||
          c.hexCode.toLowerCase().includes(colorSearch.toLowerCase()),
      )
    : colors;

  const filteredFonts = fontSearch.trim()
    ? fonts.filter((f) => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
    : fonts;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <Heading level="h1">Brand Assets</Heading>
        <Text className="text-ui-fg-subtle">
          Manage the shared colors and fonts used by customization authoring.
        </Text>
      </div>

      {/* Colors section */}
      <Container className="overflow-hidden p-0">
        <div className="flex flex-col">
          {/* Section header */}
          <div className="border-b border-ui-border-base px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2" className="text-xl font-semibold">
                  Colors
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Named hex values available in the customization editor.
                </Text>
              </div>
              <Button variant="secondary" size="small" onClick={() => setIsAddColorOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add color
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-end border-b border-ui-border-base px-6 py-4">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="search"
                placeholder="Search colors"
                className="w-[220px] pl-8"
                size="small"
                value={colorSearch}
                onChange={(e) => setColorSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="pl-6">Swatch</Table.HeaderCell>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>ID</Table.HeaderCell>
                  <Table.HeaderCell>Hex Code</Table.HeaderCell>
                  <Table.HeaderCell className="pr-6 w-20" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredColors.length === 0 ? (
                  <Table.Row>
                    <Table.Cell {...({ colSpan: 5 } as any)} className="py-8 text-center text-ui-fg-muted">
                      {colors.length === 0 ? "No colors yet. Add one to get started." : "No colors match this search."}
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredColors.map((color) => (
                    <Table.Row key={color.id}>
                      <Table.Cell className="pl-6">
                        <div
                          className="w-6 h-6 rounded-full border border-ui-border-strong"
                          style={{ backgroundColor: color.hexCode }}
                        />
                      </Table.Cell>
                      <Table.Cell className="font-medium">{color.name}</Table.Cell>
                      <Table.Cell className="text-ui-fg-subtle">{color.id}</Table.Cell>
                      <Table.Cell className="font-mono text-ui-fg-subtle">{color.hexCode}</Table.Cell>
                      <Table.Cell className="pr-6 text-right">
                        <Button variant="danger" size="small" onClick={() => handleDeleteColor(color.id)}>
                          Delete
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
      </Container>

      {/* Fonts section */}
      <Container className="overflow-hidden p-0">
        <div className="flex flex-col">
          {/* Section header */}
          <div className="border-b border-ui-border-base px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2" className="text-xl font-semibold">
                  Fonts
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Font families available in the customization editor. Upload TTF variants per family.
                </Text>
              </div>
              <Button variant="secondary" size="small" onClick={() => setIsAddFontOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add font family
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-end border-b border-ui-border-base px-6 py-4">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="search"
                placeholder="Search fonts"
                className="w-[220px] pl-8"
                size="small"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
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
                  <Table.HeaderCell className="pr-6 w-20" />
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
                    <Table.Row key={font.id}>
                      <Table.Cell className="pl-6 font-medium">{font.name}</Table.Cell>
                      <Table.Cell className="text-ui-fg-subtle">{font.id}</Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Badge color="grey">{fontVariantCount(font)} files</Badge>
                          <Text size="small" className="text-ui-fg-subtle">
                            {[
                              font.regularAssetId ? "Regular" : null,
                              font.boldAssetId ? "Bold" : null,
                              font.italicAssetId ? "Italic" : null,
                              font.boldItalicAssetId ? "Bold Italic" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="pr-6 text-right">
                        <Button variant="danger" size="small" onClick={() => handleDeleteFont(font.id)}>
                          Delete
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
      </Container>

      {/* Modals */}
      <AddColorModal
        open={isAddColorOpen}
        onOpenChange={setIsAddColorOpen}
        existingColors={colors}
        onSuccess={reload}
      />
      <AddFontModal
        open={isAddFontOpen}
        onOpenChange={setIsAddFontOpen}
        existingFonts={fonts}
        onSuccess={reload}
      />
    </div>
  );
}
