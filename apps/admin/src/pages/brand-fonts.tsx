import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Container, Heading, Input, Table, Text } from "@medusajs/ui";
import { Plus, Search } from "lucide-react";
import { AddFontModal } from "./brand-fonts-add-font-modal";
import { FontDetailModal } from "./brand-fonts-detail-modal";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { type BrandFont, useBrandAssets } from "../hooks/use-brand-assets";
function fontVariantCount(font: BrandFont) {
  return [font.regularAssetId, font.boldAssetId, font.italicAssetId, font.boldItalicAssetId].filter(Boolean).length;
}

// ─── Add Font Modal ───────────────────────────────────────────────────────────



// ─── Font Detail Modal ────────────────────────────────────────────────────────

type VariantKey = "regularAssetId" | "boldAssetId" | "italicAssetId" | "boldItalicAssetId";

const VARIANTS: { key: VariantKey; label: string; uploadParam: string }[] = [
  { key: "regularAssetId", label: "Regular", uploadParam: "regular" },
  { key: "boldAssetId", label: "Bold", uploadParam: "bold" },
  { key: "italicAssetId", label: "Italic", uploadParam: "italic" },
  { key: "boldItalicAssetId", label: "Bold Italic", uploadParam: "boldItalic" },
];



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
