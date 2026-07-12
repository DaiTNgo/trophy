import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useBreadcrumbs } from "../../hooks/use-breadcrumbs";
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Label,
  Table,
  DropdownMenu,
  Drawer,
  StatusBadge,
  Select,
} from "@medusajs/ui";
import { backendFetch } from "../../lib/fetch";
import { fetchProducts, assignProductsToCategory } from "../../lib/products-client";
import { ProductSelectorDrawer } from "../../components/product-selector-drawer";
import { EditRankingModal } from "./components/edit-ranking-modal";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { MediaPreview } from "../../components/ui/media-preview";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import { LocalizedTextField, createEmptyLocalizedText, type AdminLocale, type LocalizedTextValue } from "../../components/ui/medusa";
import { Upload, X, MoreHorizontal, Pencil, Trash, AlertCircle, Plus, Info } from "lucide-react";

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [name, setName] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [nameLocale, setNameLocale] = useState<AdminLocale>("vi");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [descriptionLocale, setDescriptionLocale] = useState<AdminLocale>("vi");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (isNew) return;

    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          backendFetch("/api/admin/product-metadata/categories"),
          fetchProducts({ categoryId: id })
        ]);

        if (catRes.ok) {
          const data = await catRes.json();
          const list = Array.isArray(data.categories) ? data.categories : [];
          setCategories(list);
          const current = list.find((c: any) => String(c.id) === id);
          if (current) {
            setName(current.name?.vi ? { vi: current.name.vi, en: current.name.en ?? "" } : createEmptyLocalizedText());
            setHandle(current.handle || "");
            setDescription(current.description?.vi ? { vi: current.description.vi, en: current.description.en ?? "" } : createEmptyLocalizedText());
            setImageUrl(current.imageUrl || "");
            setPreviewUrl(current.imageUrl || "");
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
  }, [id, isNew]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Categories", path: "/categories" },
      { label: isNew ? "Create Category" : (name.vi || "Loading..."), path: `/categories/${id}` },
    ]);
  }, [setBreadcrumbs, isNew, id, name]);

  // Clean up breadcrumbs only when the component unmounts
  useEffect(() => {
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function handleAssignProducts(selectedIds: string[]) {
    if (!id) return;
    
    const currentProductIds = new Set(products.map((p) => p.id.toString()));
    const newProductIds = new Set(selectedIds);
    
    const addProductIds = Array.from(newProductIds)
      .filter(pId => !currentProductIds.has(pId))
      .map(pId => parseInt(pId, 10));
      
    const removeProductIds = Array.from(currentProductIds)
      .filter(pId => !newProductIds.has(pId))
      .map(pId => parseInt(pId, 10));

    try {
      await assignProductsToCategory(id, { addProductIds, removeProductIds });
      // Reload products
      const prodRes = await fetchProducts({ categoryId: id });
      setProducts(prodRes || []);
    } catch (e) {
      console.error(e);
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      let fileToProcess = selectedFile;
      if (selectedFile.type === "application/pdf") {
        fileToProcess = await convertPdfToImageFile(selectedFile);
      }
      setFile(fileToProcess);
      
      const newPreviewUrl = URL.createObjectURL(fileToProcess);
      setPreviewUrl(newPreviewUrl);
      setImageUrl(""); // Clear the existing imageUrl since we have a new file
    } catch (err) {
      console.error("Failed to load file preview", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl("");
    setImageUrl("");
  };

  async function handleSave() {
    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;
      
      if (file) {
        const media = await uploadProductVariantMedia(file);
        finalImageUrl = media.contentUrl;
      }

      const payload: any = { 
        name: { vi: name.vi, en: name.en || undefined }, 
        handle: handle || null, 
        description: description.vi ? { vi: description.vi, en: description.en || undefined } : null,
        imageUrl: finalImageUrl || null 
      };
      
      const res = await backendFetch(
        `/api/admin/product-metadata/categories${isNew ? "" : `/${id}`}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        if (isNew) {
          navigate("/categories");
        } else {
          setImageUrl(finalImageUrl || "");
          setPreviewUrl(finalImageUrl || "");
          setFile(null);
        }
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
      const res = await backendFetch(`/api/admin/product-metadata/categories/${id}`, {
        method: "DELETE",
      });

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
      {!isNew ? (
        <>
          <div className="flex flex-col lg:flex-row gap-4">
            <Container className="p-0 overflow-hidden flex-1">
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h2" className="text-xl font-semibold">
                    {name.vi}
                  </Heading>
                  <div className="flex items-center gap-x-2">
                    <StatusBadge color="green">Active</StatusBadge>
                    <StatusBadge color="green">Public</StatusBadge>
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
                          <span className="sr-only">More</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onClick={() => setIsEditDrawerOpen(true)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Category
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={handleDelete} className="text-ui-fg-danger">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Category
                        </DropdownMenu.Item>
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

            <Container className="p-0 overflow-hidden w-full lg:w-[320px] h-fit">
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h2" className="text-xl font-semibold">
                    Media
                  </Heading>
                </div>
                <div className="flex flex-col gap-y-4 border-t border-ui-border-base px-6 py-4">
                  {previewUrl ? (
                    <div className="relative h-48 w-48 overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle">
                      <MediaPreview
                        src={previewUrl}
                        mimeType={file?.type || (previewUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg")}
                        className="h-full w-full object-cover"
                        alt="Category Preview"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute right-2 top-2 rounded-full bg-ui-bg-overlay p-1 text-ui-fg-on-color shadow transition hover:bg-ui-bg-overlay-hover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-48 w-48 flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted transition hover:border-ui-border-strong hover:text-ui-fg-base"
                    >
                      <Upload className="h-6 w-6" />
                      <Text size="small">Upload Image</Text>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()}>
                      {previewUrl ? "Replace" : "Upload"}
                    </Button>
                    <Button size="small" onClick={handleSave} isLoading={isSaving}>
                      Save Media
                    </Button>
                  </div>
                </div>
              </div>
            </Container>

            <Container className="p-0 overflow-hidden w-full lg:w-1/3 h-fit">
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h2" className="text-xl font-semibold">
                    Organize
                  </Heading>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
                        <span className="sr-only">More</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onClick={() => setIsRankingModalOpen(true)}>
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

          <Container className="p-0 overflow-hidden">
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2" className="text-xl font-semibold">
                  Products
                </Heading>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
                      <span className="sr-only">More</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item onClick={() => setIsDrawerOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
              <div className="flex items-center px-6 pb-4">
                <Button variant="secondary" size="small" onClick={() => setIsDrawerOpen(true)}>Add filter</Button>
              </div>
              <div className="flex flex-col border-t border-ui-border-base">
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-6 w-6 text-ui-fg-subtle mb-2" />
                  </div>
                ) : (
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell className="w-12 pl-6">
                          <input type="checkbox" className="rounded-sm border-ui-border-base" />
                        </Table.HeaderCell>
                        <Table.HeaderCell>Product</Table.HeaderCell>
                        <Table.HeaderCell>Collection</Table.HeaderCell>
                        <Table.HeaderCell>Sales Channels</Table.HeaderCell>
                        <Table.HeaderCell>Variants</Table.HeaderCell>
                        <Table.HeaderCell className="pr-6">Status</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {products.map((product) => (
                        <Table.Row key={product.id}>
                          <Table.Cell className="pl-6">
                            <input type="checkbox" className="rounded-sm border-ui-border-base" />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-x-3">
                              {product.media && product.media[0] ? (
                                <img
                                  src={product.media[0].url}
                                  alt={product.title}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-ui-bg-component rounded" />
                              )}
                              <Text size="small" weight="plus">
                                {product.title}
                              </Text>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small" className="text-ui-fg-subtle">-</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-x-1">
                              <div className="h-6 w-6 rounded flex items-center justify-center bg-ui-bg-base border border-ui-border-base">
                                <Text size="small" className="text-ui-fg-subtle">A</Text>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small" className="text-ui-fg-subtle">1 variant</Text>
                          </Table.Cell>
                          <Table.Cell className="pr-6">
                            <Text size="small">{product.status}</Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                )}
              </div>
            </div>
          </Container>

          <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
            <Drawer.Content>
              <Drawer.Header>
                <Heading>Edit Category</Heading>
              </Drawer.Header>
              <Drawer.Body className="p-4 flex flex-col gap-y-6">
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
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-y-2">
                    <Label>Status</Label>
                    <Select value="active" disabled>
                      <Select.Trigger><Select.Value placeholder="Active" /></Select.Trigger>
                      <Select.Content><Select.Item value="active">Active</Select.Item></Select.Content>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label>Visibility</Label>
                    <Select value="public" disabled>
                      <Select.Trigger><Select.Value placeholder="Public" /></Select.Trigger>
                      <Select.Content><Select.Item value="public">Public</Select.Item></Select.Content>
                    </Select>
                  </div>
                </div>
              </Drawer.Body>
              <Drawer.Footer>
                <Drawer.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Drawer.Close>
                <Button onClick={async () => { await handleSave(); setIsEditDrawerOpen(false); }} isLoading={isSaving}>
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
            items={categories.map(c => ({ id: String(c.id), name: c.name?.vi ?? "" }))}
            onSave={async (orderedItems) => {
              const res = await backendFetch("/api/admin/product-metadata/categories/ranking", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  categories: orderedItems.map((item, index) => ({ id: Number(item.id), position: index }))
                })
              });
              if (res.ok) {
                setCategories(prev => {
                  const map = new Map(prev.map(c => [String(c.id), c]));
                  return orderedItems.map(item => map.get(item.id)).filter(Boolean);
                });
              }
            }}
          />
        </>
      ) : (
        <>
          <Container>
            <div className="flex flex-col gap-y-3">
              <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
                New Category
              </Text>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-y-1">
                  <Heading level="h2">Create Category</Heading>
                  <Text size="base" className="text-ui-fg-subtle">
                    Manage category metadata.
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => navigate("/categories")}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-6 max-w-2xl">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="name" className="text-ui-fg-base">
                    Name
                  </Label>
                  <LocalizedTextField
                    id="name"
                    value={name}
                    locale={nameLocale}
                    onLocaleChange={setNameLocale}
                    onChange={setName}
                    placeholder={{ vi: "Tieu de", en: "Title" }}
                    helperText="Vietnamese is required. English is optional."
                    requiredLocales={["vi"]}
                  />
                </div>

              <div className="flex flex-col gap-y-2">
                <Label htmlFor="handle" className="text-ui-fg-base">
                  Handle (optional)
                </Label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. t-shirts"
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <Label className="text-ui-fg-base">Category Image (optional)</Label>
                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle w-48 h-48">
                    <MediaPreview
                      src={previewUrl}
                      mimeType={file?.type || (previewUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg")}
                      className="h-full w-full object-cover"
                      alt="Category Preview"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-full bg-ui-bg-overlay p-1 text-ui-fg-on-color shadow transition hover:bg-ui-bg-overlay-hover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted transition hover:border-ui-border-strong hover:text-ui-fg-base w-48 h-48"
                  >
                    <Upload className="h-6 w-6" />
                    <Text size="small">Upload Image</Text>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <Label htmlFor="description" className="text-ui-fg-base">
                  Description (optional)
                </Label>
                  <LocalizedTextField
                    id="description"
                    value={description}
                    locale={descriptionLocale}
                    onLocaleChange={setDescriptionLocale}
                    onChange={setDescription}
                    placeholder={{ vi: "Mo ta", en: "Description" }}
                    helperText="Optional in both Vietnamese and English."
                    requiredLocales={[]}
                    multiline
                  />
              </div>
            </div>
          </Container>
        </>
      )}
    </div>
  );
}
