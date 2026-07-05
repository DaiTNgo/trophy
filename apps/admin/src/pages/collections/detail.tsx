import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Label,
  Table,
} from "@medusajs/ui";
import { backendFetch } from "../../lib/fetch";
import { fetchProducts, assignProductsToCollection } from "../../lib/products-client";
import { ProductSelectorDrawer } from "../../components/product-selector-drawer";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { AdminMedia } from "../../components/ui/admin-media";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import { Upload, X } from "lucide-react";

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        const [collRes, prodRes] = await Promise.all([
          backendFetch("/api/admin/product-metadata/collections"),
          fetchProducts({ collectionId: id })
        ]);

        if (collRes.ok) {
          const data = await collRes.json();
          const collection = data.items.find((c: any) => c.id.toString() === id);
          if (collection) {
            setTitle(collection.title);
            setHandle(collection.handle || "");
            setDescription(collection.description || "");
            setImageUrl(collection.imageUrl || "");
            setPreviewUrl(collection.imageUrl || "");
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
  }, [id, isNew]);

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
      await assignProductsToCollection(id, { addProductIds, removeProductIds });
      // Reload products
      const prodRes = await fetchProducts({ collectionId: id });
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

      const payload = { 
        title, 
        handle: handle || null, 
        description: description || null,
        imageUrl: finalImageUrl || null 
      };
      
      const res = await backendFetch(
        `/api/admin/product-metadata/collections${isNew ? "" : `/${id}`}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        navigate("/collections");
      } else {
        console.error("Failed to save collection");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this collection?")) return;
    
    setIsSaving(true);
    try {
      const res = await backendFetch(`/api/admin/product-metadata/collections/${id}`, {
        method: "DELETE",
      });

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
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            {isNew ? "New Collection" : "Edit Collection"}
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">{isNew ? "Create Collection" : "Collection Details"}</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Manage collection metadata.
              </Text>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate("/collections")}>
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
            <Label htmlFor="title" className="text-ui-fg-base">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Release"
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
              placeholder="e.g. summer-release"
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label className="text-ui-fg-base">Collection Image (optional)</Label>
            <Text size="small" className="text-ui-fg-subtle mb-2">
              Upload an image to represent this collection.
            </Text>
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle w-48 h-48">
                <AdminMedia
                  src={previewUrl}
                  mimeType={file?.type || (previewUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg")}
                  className="h-full w-full object-cover"
                  alt="Collection Preview"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-full bg-ui-bg-overlay p-1 text-ui-fg-on-color shadow transition hover:bg-ui-bg-overlay-hover"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted transition hover:border-ui-border-strong hover:text-ui-fg-base w-48 h-48"
                aria-label="Upload image"
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
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Collection description"
            />
          </div>
        </div>
      </Container>

      {!isNew && (
        <Container>
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Heading level="h2">Products</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  Manage products in this collection.
                </Text>
              </div>
              <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
                Edit Products
              </Button>
            </div>
            
            {products.length === 0 ? (
              <Text className="text-ui-fg-subtle text-center py-6">
                No products in this collection.
              </Text>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Product</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {products.map((product) => (
                      <Table.Row key={product.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-x-3">
                            {product.media && product.media[0] ? (
                              <img src={product.media[0].url} alt={product.title} className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 bg-ui-bg-component rounded" />
                            )}
                            <Text size="small" weight="plus">{product.title}</Text>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small">{product.status}</Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            )}
          </div>
          
          <ProductSelectorDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            title="Edit Collection Products"
            description="Select products to add to this collection."
            initialSelectedIds={products.map(p => p.id.toString())}
            onSave={handleAssignProducts}
          />
        </Container>
      )}

      {!isNew && (
        <Container className="border-ui-border-danger">
          <div className="flex flex-col gap-y-3">
            <Heading level="h3" className="text-ui-fg-danger">
              Danger Zone
            </Heading>
            <Text size="small" className="text-ui-fg-subtle mb-2">
              Once you delete a collection, there is no going back. Please be certain.
            </Text>
            <div>
              <Button variant="danger" onClick={handleDelete} isLoading={isSaving}>
                Delete Collection
              </Button>
            </div>
          </div>
        </Container>
      )}
    </div>
  );
}
