import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useBreadcrumbs } from "../../hooks/use-breadcrumbs";
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Label,
  DropdownMenu,
  Drawer,
  StatusBadge,
  Select,
} from "@medusajs/ui";
import { backendFetch } from "../../lib/fetch";
import {
  fetchProducts,
  assignProductsToCategory,
} from "../../lib/products-client";
import { ProductSelectorDrawer } from "../../components/product-selector-drawer";
import { EditRankingModal } from "./components/edit-ranking-modal";
import { useImageUploadField } from "../../hooks/use-image-upload-field";
import { MediaCard } from "../../components/catalog/image-picker";
import {
  AssignedProductsCard,
  diffProductAssignment,
} from "../../components/catalog/assigned-products-card";
import {
  LocalizedTextField,
  createEmptyLocalizedText,
  type AdminLocale,
  type LocalizedTextValue,
} from "../../components/ui/medusa";
import { MoreHorizontal, Pencil, Trash, Info } from "lucide-react";

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [name, setName] = useState<LocalizedTextValue>(() =>
    createEmptyLocalizedText(),
  );
  const [nameLocale, setNameLocale] = useState<AdminLocale>("vi");
  const [handle, setHandle] = useState("");
  const [isSystem, setIsSystem] = useState(false);
  const [description, setDescription] = useState<LocalizedTextValue>(() =>
    createEmptyLocalizedText(),
  );
  const [descriptionLocale, setDescriptionLocale] = useState<AdminLocale>("vi");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const image = useImageUploadField();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          backendFetch("/api/admin/product-metadata/categories"),
          fetchProducts({ categoryId: id }),
        ]);

        if (catRes.ok) {
          const data = await catRes.json();
          const list = Array.isArray(data.categories) ? data.categories : [];
          setCategories(list);
          const current = list.find((c: any) => String(c.id) === id);
          if (current) {
            setName(
              current.name?.vi
                ? { vi: current.name.vi, en: current.name.en ?? "" }
                : createEmptyLocalizedText(),
            );
            setHandle(current.handle || "");
            setIsSystem(Boolean(current.isSystem));
            setDescription(
              current.description?.vi
                ? {
                    vi: current.description.vi,
                    en: current.description.en ?? "",
                  }
                : createEmptyLocalizedText(),
            );
            image.reset(current.imageUrl || "");
            setVisibility(
              current.visibility === "hidden" ? "hidden" : "public",
            );
          }
        }
        setProducts(prodRes || []);
      } catch (e) {
        console.error("Failed to load category data", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Categories", path: "/categories" },
      { label: name.vi || "Loading...", path: `/categories/${id}` },
    ]);
  }, [setBreadcrumbs, id, name]);

  // Clean up breadcrumbs only when the component unmounts
  useEffect(() => {
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function handleAssignProducts(selectedIds: string[]) {
    if (!id) return;

    try {
      await assignProductsToCategory(id, diffProductAssignment(products, selectedIds));
      // Reload products
      const prodRes = await fetchProducts({ categoryId: id });
      setProducts(prodRes || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveMedia() {
    setIsSaving(true);
    image.setError(null);
    try {
      const finalImageUrl = await image.resolveImageUrl();

      const res = await backendFetch(
        `/api/admin/product-metadata/categories/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: finalImageUrl || null }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save category media");
      }

      image.reset(finalImageUrl);
    } catch (e) {
      console.error(e);
      image.setError(e instanceof Error ? e.message : "Failed to save category media");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload = isSystem
        ? { visibility }
        : {
            name: { vi: name.vi, en: name.en || undefined },
            handle: handle || null,
            description: description.vi
              ? { vi: description.vi, en: description.en || undefined }
              : null,
            visibility,
          };

      const res = await backendFetch(
        `/api/admin/product-metadata/categories/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        setIsEditDrawerOpen(false);
      } else {
        console.error("Failed to save category");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setIsSaving(true);
    try {
      const res = await backendFetch(
        `/api/admin/product-metadata/categories/${id}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        navigate("/categories");
      } else {
        console.error("Failed to delete category");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <Container className="p-0 overflow-hidden flex-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2" className="text-xl font-semibold">
                {name.vi}
              </Heading>
              <div className="flex items-center gap-x-2">
                <StatusBadge
                  color={visibility === "hidden" ? "orange" : "green"}
                >
                  {visibility === "hidden" ? "Hidden" : "Public"}
                </StatusBadge>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      variant="secondary"
                      size="small"
                      className="px-2 flex items-center justify-center h-[28px]"
                    >
                      <span className="sr-only">More</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item
                      onClick={() => setIsEditDrawerOpen(true)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Category
                    </DropdownMenu.Item>
                    {!isSystem ? (
                      <DropdownMenu.Item
                        onClick={handleDelete}
                        className="text-ui-fg-danger"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Category
                      </DropdownMenu.Item>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex flex-col border-t border-ui-border-base">
              <div className="grid grid-cols-2 items-center px-6 py-4">
                <Text size="small" className="text-ui-fg-subtle">
                  Description
                </Text>
                <Text size="small">{description.vi || "-"}</Text>
              </div>
              <div className="grid grid-cols-2 items-center px-6 py-4 border-t border-ui-border-base">
                <Text size="small" className="text-ui-fg-subtle">
                  Handle
                </Text>
                <Text size="small">{handle ? `/${handle}` : "-"}</Text>
              </div>
            </div>
          </div>
        </Container>

        <MediaCard
          field={image}
          alt="Category Preview"
          isSaving={isSaving}
          onSave={handleSaveMedia}
        />

        <Container className="p-0 overflow-hidden w-full lg:w-1/3 h-fit">
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2" className="text-xl font-semibold">
                Organize
              </Heading>
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="secondary"
                    size="small"
                    className="px-2 flex items-center justify-center h-[28px]"
                  >
                    <span className="sr-only">More</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item
                    onClick={() => setIsRankingModalOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit ranking
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
            <div className="flex flex-col border-t border-ui-border-base">
              <div className="grid grid-cols-2 items-center px-6 py-4">
                <Text size="small" className="text-ui-fg-subtle">
                  Path
                </Text>
                <Text size="small">{name.vi || "-"}</Text>
              </div>
              <div className="grid grid-cols-2 items-center px-6 py-4 border-t border-ui-border-base">
                <Text size="small" className="text-ui-fg-subtle">
                  Children
                </Text>
                <Text size="small">-</Text>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <AssignedProductsCard
        products={products}
        onEdit={() => setIsDrawerOpen(true)}
      />

      <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Heading>Edit Category</Heading>
          </Drawer.Header>
          <Drawer.Body className="p-4 flex flex-col gap-y-6">
            {isSystem ? (
              <Text
                size="small"
                className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3 text-ui-fg-subtle"
              >
                This is a system category. Only its image and ranking can be
                changed.
              </Text>
            ) : null}
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="edit-name" className="text-ui-fg-base">
                Title
              </Label>
              <LocalizedTextField
                id="edit-name"
                value={name}
                locale={nameLocale}
                onLocaleChange={setNameLocale}
                onChange={setName}
                placeholder={{ vi: "Tieu de", en: "Title" }}
                helperText="Vietnamese is required. English is optional."
                requiredLocales={["vi"]}
                disabled={isSystem}
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="edit-handle" className="text-ui-fg-base">
                  Handle
                </Label>
                <Info className="h-4 w-4 text-ui-fg-subtle" />
                <span className="text-ui-fg-subtle text-xs">(Optional)</span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center justify-center px-3 py-[9px] border border-r-0 border-ui-border-base bg-ui-bg-subtle rounded-l-md text-ui-fg-subtle">
                  /
                </div>
                <Input
                  id="edit-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="sweatshirts"
                  className="rounded-l-none"
                  disabled={isSystem}
                />
              </div>
            </div>

            <div className="flex flex-col gap-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="edit-description" className="text-ui-fg-base">
                  Description
                </Label>
                <span className="text-ui-fg-subtle text-xs">(Optional)</span>
              </div>
              <LocalizedTextField
                id="edit-description"
                value={description}
                locale={descriptionLocale}
                onLocaleChange={setDescriptionLocale}
                onChange={setDescription}
                placeholder={{ vi: "Mo ta", en: "Description" }}
                helperText="Optional in both Vietnamese and English."
                requiredLocales={[]}
                multiline
                rows={4}
                disabled={isSystem}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-y-2">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(value) =>
                    setVisibility(value as "public" | "hidden")
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="public">Public</Select.Item>
                    <Select.Item value="hidden">Hidden</Select.Item>
                  </Select.Content>
                </Select>
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <ProductSelectorDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Edit Category Products"
        description="Select products to add to this category."
        initialSelectedIds={products.map((p) => p.id.toString())}
        onSave={handleAssignProducts}
      />

      <EditRankingModal
        open={isRankingModalOpen}
        onOpenChange={setIsRankingModalOpen}
        items={categories.map((c) => ({
          id: String(c.id),
          name: c.name?.vi ?? "",
        }))}
        onSave={async (orderedItems) => {
          const res = await backendFetch(
            "/api/admin/product-metadata/categories/ranking",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categories: orderedItems.map((item, index) => ({
                  id: Number(item.id),
                  position: index,
                })),
              }),
            },
          );
          if (res.ok) {
            setCategories((prev) => {
              const map = new Map(prev.map((c) => [String(c.id), c]));
              return orderedItems
                .map((item) => map.get(item.id))
                .filter(Boolean);
            });
          }
        }}
      />
    </div>
  );
}
