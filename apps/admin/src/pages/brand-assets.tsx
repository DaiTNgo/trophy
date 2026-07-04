import { useState, useEffect } from "react";
import { Container, Heading, Text, Button, Table, Tabs, Input, Label } from "@medusajs/ui";
import { Plus } from "lucide-react";
import { backendFetch } from "../lib/fetch";

export function BrandAssetsPage() {
  const [colors, setColors] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  
  // Color Form
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  // Font Form
  const [fontName, setFontName] = useState("");
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [boldItalicFile, setBoldItalicFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchColors = async () => {
    const res = await backendFetch("/api/admin/brand-assets/colors");
    if (res.ok) {
      const data = await res.json();
      setColors(data.colors);
    }
  };

  const fetchFonts = async () => {
    const res = await backendFetch("/api/admin/brand-assets/fonts");
    if (res.ok) {
      const data = await res.json();
      setFonts(data.fonts);
    }
  };

  useEffect(() => {
    fetchColors();
    fetchFonts();
  }, []);

  const handleAddColor = async () => {
    if (!colorName || !colorHex) return;
    
    const generatedColorId = colorName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!generatedColorId) return;

    if (colors.some(c => c.id === generatedColorId)) {
      alert(`A color with the name "${colorName}" already exists.`);
      return;
    }

    const res = await backendFetch("/api/admin/brand-assets/colors", {
      method: "POST",
      body: JSON.stringify({ id: generatedColorId, name: colorName, hexCode: colorHex }),
    });
    if (res.ok) {
      fetchColors();
      setColorName("");
      setColorHex("#000000");
    } else {
      const errorData = await res.json().catch(() => null);
      alert(errorData?.error || "Failed to add color");
    }
  };

  const handleDeleteColor = async (id: string) => {
    await backendFetch(`/api/admin/brand-assets/colors/${id}`, { method: "DELETE" });
    fetchColors();
  };

  const handleAddFont = async () => {
    if (!fontName) return;

    const generatedFontId = fontName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!generatedFontId) {
      alert("Invalid font name");
      return;
    }

    if (fonts.some(f => f.id === generatedFontId)) {
      alert(`A font family with the name "${fontName}" already exists.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadFile = async (file: File | null) => {
        if (!file) return null;
        const res = await backendFetch("/api/admin/brand-assets/fonts/upload", {
          method: "POST",
          headers: { "Content-Type": file.type || "font/ttf" },
          body: file,
        });
        if (!res.ok) throw new Error("Failed to upload " + file.name);
        const data = await res.json();
        return data.assetId;
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
          name: fontName,
          regularAssetId,
          boldAssetId,
          italicAssetId,
          boldItalicAssetId
        }),
      });
      if (res.ok) {
        fetchFonts();
        setFontName("");
        setRegularFile(null);
        setBoldFile(null);
        setItalicFile(null);
        setBoldItalicFile(null);
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create font family");
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFont = async (id: string) => {
    await backendFetch(`/api/admin/brand-assets/fonts/${id}`, { method: "DELETE" });
    fetchFonts();
  };

  return (
    <Container className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level="h1">Brand Assets</Heading>
        <Text className="text-ui-fg-subtle">
          Manage global fonts and default colors used across all customization templates.
        </Text>
      </div>

      <Tabs defaultValue="colors">
        <Tabs.List>
          <Tabs.Trigger value="colors">Colors</Tabs.Trigger>
          <Tabs.Trigger value="fonts">Fonts</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="colors" className="flex flex-col gap-6 mt-4">
          <div className="flex flex-col gap-4 bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
            <Heading level="h3">Add New Color</Heading>
            <div className="flex gap-4 items-end">
              <div className="flex flex-col gap-2 flex-1">
                <Label>Name</Label>
                <Input placeholder="e.g. Primary Gold" value={colorName} onChange={(e) => setColorName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <Label>Hex Code</Label>
                <div className="flex gap-2">
                  <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-10 h-10 p-1 bg-white border border-ui-border-base rounded" />
                  <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleAddColor}><Plus className="w-4 h-4 mr-2" /> Add Color</Button>
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
              {colors.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell>
                    <div className="w-6 h-6 rounded-full border border-ui-border-strong" style={{ backgroundColor: c.hexCode }} />
                  </Table.Cell>
                  <Table.Cell>{c.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{c.id}</Table.Cell>
                  <Table.Cell className="font-mono text-ui-fg-subtle">{c.hexCode}</Table.Cell>
                  <Table.Cell className="text-right">
                    <Button variant="danger" size="small" onClick={() => handleDeleteColor(c.id)}>Delete</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
              {colors.length === 0 && (
                <Table.Row>
                  <Table.Cell className="text-center text-ui-fg-subtle py-8">
                    No colors defined yet.
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Tabs.Content>

        <Tabs.Content value="fonts" className="flex flex-col gap-6 mt-4">
          <div className="flex flex-col gap-4 bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
            <Heading level="h3">Add Font Family</Heading>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Family Name</Label>
                <Input placeholder="e.g. Roboto Slab" value={fontName} onChange={(e) => setFontName(e.target.value)} disabled={isUploading} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Regular TTF</Label>
                  <Input type="file" accept=".ttf" onChange={(e) => setRegularFile(e.target.files?.[0] || null)} disabled={isUploading} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Bold TTF</Label>
                  <Input type="file" accept=".ttf" onChange={(e) => setBoldFile(e.target.files?.[0] || null)} disabled={isUploading} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Italic TTF</Label>
                  <Input type="file" accept=".ttf" onChange={(e) => setItalicFile(e.target.files?.[0] || null)} disabled={isUploading} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Bold Italic TTF</Label>
                  <Input type="file" accept=".ttf" onChange={(e) => setBoldItalicFile(e.target.files?.[0] || null)} disabled={isUploading} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddFont} isLoading={isUploading} disabled={isUploading || !fontName}>
                  <Plus className="w-4 h-4 mr-2" /> Create Family
                </Button>
              </div>
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
              {fonts.map((f) => (
                <Table.Row key={f.id}>
                  <Table.Cell className="font-medium">{f.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{f.id}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${f.regularAssetId ? 'bg-ui-bg-interactive text-ui-fg-on-inverted' : 'bg-ui-bg-base text-ui-fg-muted border'}`}>Regular</span>
                      <span className={`px-2 py-1 text-xs rounded ${f.boldAssetId ? 'bg-ui-bg-interactive text-ui-fg-on-inverted' : 'bg-ui-bg-base text-ui-fg-muted border'}`}>Bold</span>
                      <span className={`px-2 py-1 text-xs rounded ${f.italicAssetId ? 'bg-ui-bg-interactive text-ui-fg-on-inverted' : 'bg-ui-bg-base text-ui-fg-muted border'}`}>Italic</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <Button variant="danger" size="small" onClick={() => handleDeleteFont(f.id)}>Delete</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
              {fonts.length === 0 && (
                <Table.Row>
                  <Table.Cell className="text-center text-ui-fg-subtle py-8">
                    No font families defined yet.
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Tabs.Content>
      </Tabs>
    </Container>
  );
}
