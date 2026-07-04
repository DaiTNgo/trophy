import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Label,
} from "@medusajs/ui";
import { backendFetch } from "../../lib/fetch";

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;

    async function loadCategory() {
      try {
        const res = await backendFetch("/api/admin/product-metadata/categories");
        if (res.ok) {
          const data = await res.json();
          const category = data.items.find((c: any) => c.id.toString() === id);
          if (category) {
            setName(category.name);
            setHandle(category.handle || "");
            setDescription(category.description || "");
            setParentId(category.parentId ? category.parentId.toString() : "");
          }
        }
      } catch (e) {
        console.error("Failed to load category", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadCategory();
  }, [id, isNew]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: any = { 
        name, 
        handle: handle || null, 
        description: description || null 
      };
      
      if (parentId) {
        payload.parentId = parseInt(parentId, 10);
      } else {
        payload.parentId = null;
      }
      
      const res = await backendFetch(
        `/api/admin/product-metadata/categories${isNew ? "" : `/${id}`}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        navigate("/categories");
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
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            {isNew ? "New Category" : "Edit Category"}
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">{isNew ? "Create Category" : "Category Details"}</Heading>
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
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. T-Shirts"
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
            <Label htmlFor="description" className="text-ui-fg-base">
              Description (optional)
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Category description"
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="parentId" className="text-ui-fg-base">
              Parent ID (optional)
            </Label>
            <Input
              id="parentId"
              type="number"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
        </div>
      </Container>

      {!isNew && (
        <Container className="border-ui-border-danger">
          <div className="flex flex-col gap-y-3">
            <Heading level="h3" className="text-ui-fg-danger">
              Danger Zone
            </Heading>
            <Text size="small" className="text-ui-fg-subtle mb-2">
              Once you delete a category, there is no going back. Please be certain.
            </Text>
            <div>
              <Button variant="danger" onClick={handleDelete} isLoading={isSaving}>
                Delete Category
              </Button>
            </div>
          </div>
        </Container>
      )}
    </div>
  );
}
