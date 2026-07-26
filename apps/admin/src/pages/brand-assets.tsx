import { useState } from "react";
import { Badge, Button, Container, Heading, Input, Table, Text } from "@medusajs/ui";
import { Plus, Search } from "lucide-react";
import { AddColorModal } from "./brand-assets-add-color-modal";
import { AddFontModal } from "./brand-assets-add-font-modal";
import { type BrandFont, useBrandAssets } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

// ─── Add Color Modal ─────────────────────────────────────────────────────────



// ─── Add Font Modal ───────────────────────────────────────────────────────────



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
