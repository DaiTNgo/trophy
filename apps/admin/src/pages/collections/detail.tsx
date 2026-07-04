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

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;

    async function loadCollection() {
      try {
        const res = await backendFetch("/api/admin/product-metadata/collections");
        if (res.ok) {
          const data = await res.json();
          const collection = data.items.find((c: any) => c.id.toString() === id);
          if (collection) {
            setTitle(collection.title);
            setHandle(collection.handle || "");
            setDescription(collection.description || "");
          }
        }
      } catch (e) {
        console.error("Failed to load collection", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [id, isNew]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload = { title, handle: handle || null, description: description || null };
      
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
