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
  Select,
} from "@medusajs/ui";
import { backendFetch } from "../../lib/fetch";
import {
  fetchProducts,
  assignProductsToCollection,
} from "../../lib/products-client";
import { ProductSelectorDrawer } from "../../components/product-selector-drawer";
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
import { MoreHorizontal, Pencil, Trash } from "lucide-react";

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [title, setTitle] = useState<LocalizedTextValue>(() =>
    createEmptyLocalizedText(),
  );
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [handle, setHandle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const image = useImageUploadField();

  const [products, setProducts] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [collRes, prodRes] = await Promise.all([
          backendFetch("/api/admin/product-metadata/collections"),
          fetchProducts({ collectionId: id }),
        ]);

        if (collRes.ok) {
          const data = await collRes.json();
          const collection = data.items.find(
            (c: any) => c.id.toString() === id,
          );
          if (collection) {
            setTitle(
              typeof collection.title === "string"
                ? { vi: collection.title, en: "" }
                : {
                    vi: collection.title.vi ?? "",
                    en: collection.title.en ?? "",
                  },
            );
            setHandle(collection.handle || "");
            setVisibility(
              collection.visibility === "hidden" ? "hidden" : "public",
            );
            image.reset(collection.imageUrl || "");
          }
        }
        setProducts(prodRes || []);
      } catch (e) {
        console.error("Failed to load collection data", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Collections", path: "/collections" },
      {
        label: title.vi || title.en || "Untitled",
        path: `/collections/${id}`,
      },
    ]);
  }, [title, id, setBreadcrumbs]);

  // Clean up breadcrumbs only when the component unmounts
  useEffect(() => {
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function handleAssignProducts(selectedIds: string[]) {
    if (!id) return;

    try {
      await assignProductsToCollection(id, diffProductAssignment(products, selectedIds));
      // Reload products
      const prodRes = await fetchProducts({ collectionId: id });
      setProducts(prodRes || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    image.setError(null);
    try {
      const finalImageUrl = await image.resolveImageUrl();

      const payload = {
        title: { vi: title.vi, en: title.en || undefined },
        handle: handle || null,
        imageUrl: finalImageUrl || null,
        visibility,
      };

      const res = await backendFetch(
        `/api/admin/product-metadata/collections/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save collection");
      }
      image.reset(finalImageUrl);
    } catch (e) {
      console.error(e);
      image.setError(e instanceof Error ? e.message : "Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this collection?")) return;

    setIsSaving(true);
    try {
      const res = await backendFetch(
        `/api/admin/product-metadata/collections/${id}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        navigate("/collections");
      } else {
        console.error("Failed to delete collection");
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
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        <Container className="p-0 overflow-hidden flex-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2" className="text-xl font-semibold">
                {title.vi || title.en}
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
                  <DropdownMenu.Item onClick={() => setIsEditDrawerOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Collection
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={handleDelete}
                    className="text-ui-fg-danger"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Collection
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
            <div className="flex flex-col border-t border-ui-border-base">
              <div className="flex items-center justify-between px-6 py-4">
                <Text size="small" className="text-ui-fg-subtle">
                  Handle
                </Text>
                <Text size="small">{handle || "-"}</Text>
              </div>
              <div className="flex items-center justify-between border-t border-ui-border-base px-6 py-4">
                <Text size="small" className="text-ui-fg-subtle">
                  Visibility
                </Text>
                <Text size="small">
                  {visibility === "hidden" ? "Hidden" : "Public"}
                </Text>
              </div>
            </div>
          </div>
        </Container>

        <MediaCard
          field={image}
          alt="Collection Preview"
          isSaving={isSaving}
          onSave={handleSave}
        />
      </div>

      <AssignedProductsCard
        products={products}
        onEdit={() => setIsDrawerOpen(true)}
      />

      <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Heading>Edit Collection</Heading>
          </Drawer.Header>
          <Drawer.Body className="p-4 flex flex-col gap-y-6">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="edit-title" className="text-ui-fg-base">
                Title
              </Label>
              <LocalizedTextField
                id="edit-title"
                value={title}
                locale={titleLocale}
                onLocaleChange={setTitleLocale}
                onChange={setTitle}
                placeholder={{ vi: "Tieu de", en: "Title" }}
                helperText="Vietnamese is required. English is optional."
                requiredLocales={["vi"]}
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label htmlFor="edit-visibility" className="text-ui-fg-base">
                Visibility
              </Label>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as "public" | "hidden")
                }
              >
                <Select.Trigger id="edit-visibility">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="public">Public</Select.Item>
                  <Select.Item value="hidden">Hidden</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="flex flex-col gap-y-2">
              <Label htmlFor="edit-handle" className="text-ui-fg-base">
                Handle (optional)
              </Label>
              <Input
                id="edit-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. summer-release"
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button
              onClick={async () => {
                await handleSave();
                setIsEditDrawerOpen(false);
              }}
              isLoading={isSaving}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <ProductSelectorDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Edit Collection Products"
        description="Select products to add to this collection."
        initialSelectedIds={products.map((p) => p.id.toString())}
        onSave={handleAssignProducts}
      />
    </div>
  );
}
