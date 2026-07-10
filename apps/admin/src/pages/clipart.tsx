import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  Container,
  DropdownMenu,
  FocusModal,
  Heading,
  Input,
  Label,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus, Search } from "lucide-react";
import type { ClipartCategory } from "../hooks/use-brand-assets";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { backendFetch } from "../lib/fetch";
import { ClipartUploadQueue } from "../components/customization/clipart-upload-queue";
import { type UploadDraft, buildUploadDraftErrors } from "../lib/clipart-utils";

type CreateClipartCategoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatUpdatedAt(timestamp: number) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleString();
}

function CreateClipartCategoryModal({ open, onOpenChange }: CreateClipartCategoryModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);

  const uploadDraftErrors = useMemo(() => buildUploadDraftErrors(uploadDrafts), [uploadDrafts]);
  const hasUploadDraftErrors = uploadDraftErrors.some((errors) => errors.length > 0);

  useEffect(() => {
    if (!open) {
      setName("");
      setErrorMessage(null);
      setIsSaving(false);
      setUploadDrafts([]);
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await backendFetch("/api/admin/customization/clipart/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create clipart category");
      }
      const data = (await res.json()) as { category: { id: string } };
      
      if (uploadDrafts.length > 0) {
        const formData = new FormData();
        formData.set("namesJson", JSON.stringify(uploadDrafts.map((draft) => draft.name.trim())));
        for (const draft of uploadDrafts) {
          formData.append("files", draft.file);
        }

        const uploadRes = await backendFetch(`/api/admin/customization/clipart/categories/${data.category.id}/assets/batch`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => null);
          const rowErrors = Array.isArray(uploadData?.rowErrors)
            ? uploadData.rowErrors
                .map((entry: { row?: number; message?: string }) =>
                  typeof entry?.row === "number" && entry?.message ? `Row ${entry.row}: ${entry.message}` : null,
                )
                .filter(Boolean)
                .join(" ")
            : "";
          
          throw new Error(rowErrors || uploadData?.error || "Category created, but failed to upload clipart batch. Please retry from the detail page.");
        }
      }

      onOpenChange(false);
      navigate(`/customization/clipart/${data.category.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create clipart category");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Create clipart category</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Create a category first, then manage uploads and shopper-facing media inside its detail page.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="clipart-category-name">Category name</Label>
              <Input
                id="clipart-category-name"
                placeholder="e.g. Sports"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSaving}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Upload clipart (optional)</Label>
              <ClipartUploadQueue
                uploadDrafts={uploadDrafts}
                setUploadDrafts={setUploadDrafts}
                isUploading={isSaving}
                categoryActive={true}
                showActionButtons={false}
              />
            </div>
            {errorMessage ? (
              <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
                <Text size="small">{errorMessage}</Text>
              </div>
            ) : null}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            <Button onClick={handleSave} isLoading={isSaving} disabled={!name.trim() || isSaving || hasUploadDraftErrors}>
              {uploadDrafts.length > 0 ? "Create & upload" : "Create category"}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

export function ClipartPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [categories, setCategories] = useState<ClipartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isReorderingCategoryId, setIsReorderingCategoryId] = useState<string | null>(null);
  const [categoryActionId, setCategoryActionId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Clipart", path: "/customization/clipart" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  async function loadCategories() {
    try {
      setErrorMessage(null);
      const res = await backendFetch("/api/admin/customization/clipart/categories");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load clipart categories");
      }
      const data = (await res.json()) as { categories: ClipartCategory[] };
      setCategories(data.categories);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load clipart categories");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleReorderCategory(categoryId: string, offset: -1 | 1) {
    const currentIndex = categories.findIndex((category) => category.id === categoryId);
    const targetIndex = currentIndex + offset;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const nextCategoryIds = categories.map((category) => category.id);
    const [moved] = nextCategoryIds.splice(currentIndex, 1);
    nextCategoryIds.splice(targetIndex, 0, moved);

    setIsReorderingCategoryId(categoryId);
    setErrorMessage(null);
    try {
      const res = await backendFetch("/api/admin/customization/clipart/categories/reorder", {
        method: "POST",
        body: JSON.stringify({ categoryIds: nextCategoryIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to reorder clipart categories");
      }
      await loadCategories();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reorder clipart categories");
    } finally {
      setIsReorderingCategoryId(null);
    }
  }

  async function handleToggleCategoryActive(category: ClipartCategory, nextActive: boolean) {
    setCategoryActionId(category.id);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/customization/clipart/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update clipart category");
      }
      await loadCategories();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update clipart category");
    } finally {
      setCategoryActionId(null);
    }
  }

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, search]);

  return (
    <Container className="overflow-hidden p-0">
      <div className="flex flex-col">
        <div className="border-b border-ui-border-base px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2" className="text-xl font-semibold">
                Clipart
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Manage clipart categories, then open one category to upload and maintain shopper-facing artwork.
              </Text>
            </div>
            <Button variant="secondary" size="small" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create category
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end border-b border-ui-border-base px-6 py-4">
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
              <Search className="h-4 w-4" />
            </div>
            <Input
              type="search"
              placeholder="Search categories"
              className="w-[220px] pl-8"
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-ui-border-base px-6 py-4">
            <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
              <Text size="small">{errorMessage}</Text>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="pl-6">Name</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Active assets</Table.HeaderCell>
                <Table.HeaderCell>Updated</Table.HeaderCell>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell className="pr-6 w-12" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 6 } as any)} className="py-8 text-center text-ui-fg-muted">
                    Loading...
                  </Table.Cell>
                </Table.Row>
              ) : filteredCategories.length === 0 ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 6 } as any)} className="py-8 text-center text-ui-fg-muted">
                    {categories.length === 0 ? "No clipart categories found." : "No categories match this search."}
                  </Table.Cell>
                </Table.Row>
              ) : (
                filteredCategories.map((category) => {
                  const actualIndex = categories.findIndex((entry) => entry.id === category.id);
                  return (
                  <Table.Row key={category.id}>
                    <Table.Cell className="pl-6">
                      <Link
                        to={`/customization/clipart/${category.id}`}
                        className="font-medium text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                      >
                        {category.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={category.active ? "green" : "orange"}>
                        {category.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {category.activeAssetCount ?? 0}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {formatUpdatedAt(category.updatedAt)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleReorderCategory(category.id, -1)}
                          disabled={actualIndex === 0 || isReorderingCategoryId === category.id}
                          isLoading={isReorderingCategoryId === category.id}
                          className="px-2"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleReorderCategory(category.id, 1)}
                          disabled={actualIndex === categories.length - 1 || isReorderingCategoryId === category.id}
                          className="px-2"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="pr-6">
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="secondary" size="small" className="flex h-[28px] items-center justify-center px-2">
                            <span className="sr-only">More</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Item onClick={() => navigate(`/customization/clipart/${category.id}`)}>
                            Open
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={() => handleToggleCategoryActive(category, !category.active)}
                            disabled={categoryActionId === category.id}
                          >
                            {category.active ? "Deactivate" : "Reactivate"}
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                )})
              )}
            </Table.Body>
          </Table>
        </div>
      </div>

      <CreateClipartCategoryModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </Container>
  );
}
