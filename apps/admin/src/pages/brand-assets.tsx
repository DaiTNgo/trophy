import { useState } from "react";
import { Badge, Button, Container, Heading, Input, Label, Table, Tabs, Text } from "@medusajs/ui";
import { Plus } from "lucide-react";
import { type BrandColor, type BrandFont, useBrandAssets } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

export function BrandAssetsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { colors, fonts } = useBrandAssets(refreshKey);

  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const [fontName, setFontName] = useState("");
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [boldItalicFile, setBoldItalicFile] = useState<File | null>(null);
  const [isSubmittingColor, setIsSubmittingColor] = useState(false);
  const [isSubmittingFont, setIsSubmittingFont] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <Container className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level="h1">Brand Assets</Heading>
        <Text className="text-ui-fg-subtle">
          Manage the shared colors and fonts used by customization authoring.
        </Text>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
          <Text size="small">{errorMessage}</Text>
        </div>
      ) : null}

      <Tabs defaultValue="colors">
        <Tabs.List>
          <Tabs.Trigger value="colors">Colors</Tabs.Trigger>
          <Tabs.Trigger value="fonts">Fonts</Tabs.Trigger>
        </Tabs.List>

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
