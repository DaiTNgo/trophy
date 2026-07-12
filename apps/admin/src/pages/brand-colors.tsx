import { useEffect, useMemo, useState } from "react";
import { Button, Container, Heading, Input, Label, Table, Text } from "@medusajs/ui";
import { Plus, Search } from "lucide-react";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useBrandAssets } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export function BrandColorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { colors } = useBrandAssets(refreshKey);
  const { setBreadcrumbs } = useBreadcrumbs();

  const [search, setSearch] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Colors", path: "/customization/colors" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function reload() {
    setRefreshKey((k) => k + 1);
  }

  async function handleAdd() {
    if (!colorName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const id = createSlug(colorName);
      if (!id) throw new Error("Invalid color name");
      if (colors.some((c) => c.id === id)) {
        throw new Error(`A color with the name "${colorName}" already exists.`);
      }

      const res = await backendFetch("/api/admin/brand-assets/colors", {
        method: "POST",
        body: JSON.stringify({ id, name: colorName.trim(), hexCode: colorHex }),
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
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await backendFetch(`/api/admin/brand-assets/colors/${id}`, { method: "DELETE" });
    await reload();
  }

  const filteredColors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colors;
    return colors.filter(
      (c) => c.name.toLowerCase().includes(q) || c.hexCode.toLowerCase().includes(q),
    );
  }, [colors, search]);

  return (
    <Container className="overflow-hidden p-0">
      <div className="flex flex-col">
        {/* Header */}
        <div className="border-b border-ui-border-base px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2" className="text-xl font-semibold">
              Colors
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Named hex values available in the customization editor.
            </Text>
          </div>
        </div>

        {/* Inline add form */}
        <div className="border-b border-ui-border-base bg-ui-bg-subtle px-6 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
              <Label htmlFor="color-name" className="text-xs">Name</Label>
              <Input
                id="color-name"
                placeholder="e.g. Primary Gold"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                size="small"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="color-hex" className="text-xs">Hex Code</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-8 h-8 p-0.5 bg-white border border-ui-border-base rounded cursor-pointer shrink-0"
                  disabled={isSubmitting}
                />
                <Input
                  id="color-hex"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  disabled={isSubmitting}
                  className="w-32 font-mono"
                  size="small"
                />
              </div>
            </div>
            <Button
              size="small"
              onClick={handleAdd}
              isLoading={isSubmitting}
              disabled={!colorName.trim() || isSubmitting}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add color
            </Button>
          </div>
          {errorMessage ? (
            <div className="mt-3 rounded-md border border-ui-border-error bg-ui-bg-error p-2.5">
              <Text size="small">{errorMessage}</Text>
            </div>
          ) : null}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-end border-b border-ui-border-base px-6 py-3">
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
              <Search className="h-4 w-4" />
            </div>
            <Input
              type="search"
              placeholder="Search colors"
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
                    {colors.length === 0
                      ? "No colors yet. Add one above to get started."
                      : "No colors match this search."}
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
                    <Table.Cell className="text-ui-fg-subtle font-mono text-xs">{color.id}</Table.Cell>
                    <Table.Cell className="font-mono text-ui-fg-subtle">{color.hexCode}</Table.Cell>
                    <Table.Cell className="pr-6 text-right">
                      <Button variant="danger" size="small" onClick={() => handleDelete(color.id)}>
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
  );
}
