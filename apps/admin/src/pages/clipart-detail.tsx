import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, Container, Heading, Label, StatusBadge, Table, Text } from "@medusajs/ui";
import { ArrowLeft, Check, PenSquare, Trash2 } from "lucide-react";
import { MediaPreview } from "../components/ui/media-preview";
import type { BrandClipartAsset, ClipartCategory } from "../hooks/use-brand-assets";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { backendFetch } from "../lib/fetch";

import { formatClipartMimeType, type UploadDraft, buildUploadDraftErrors, clipartNameToValue, toClipartNamePayload } from "../lib/clipart-utils";
import { ClipartUploadQueue } from "../components/customization/clipart-upload-queue";
import {
  LocalizedTextField,
  createEmptyLocalizedText,
  type AdminLocale,
  type LocalizedTextValue,
} from "../components/ui/medusa";

export function ClipartDetailPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [category, setCategory] = useState<ClipartCategory | null>(null);
  const [assets, setAssets] = useState<BrandClipartAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [categoryNameLocale, setCategoryNameLocale] = useState<AdminLocale>("vi");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [editingAssetLocale, setEditingAssetLocale] = useState<AdminLocale>("vi");
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [assetActionId, setAssetActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    async function loadCategory() {
      try {
        setErrorMessage(null);
        setIsLoading(true);
        const res = await backendFetch("/api/admin/customization/clipart/categories");
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to load clipart category");
        }
        const data = (await res.json()) as { categories: ClipartCategory[] };
        const currentCategory = data.categories.find((entry) => entry.id === categoryId) ?? null;
        setCategory(currentCategory);
        setCategoryNameInput(
          currentCategory
            ? clipartNameToValue(currentCategory)
            : createEmptyLocalizedText(),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load clipart category");
      } finally {
        setIsLoading(false);
      }
    }

    loadCategory();
  }, [categoryId]);

  async function loadAssets() {
    if (!categoryId) return;
    try {
      setErrorMessage(null);
      setIsLoadingAssets(true);
      const res = await backendFetch(`/api/admin/customization/clipart/categories/${categoryId}/assets`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load clipart media");
      }
      const data = (await res.json()) as {
        assets: Array<Omit<BrandClipartAsset, "categoryName">>;
      };
      setAssets(
        data.assets.map((asset) => ({
          ...asset,
          categoryName: category?.name ?? "",
        })),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load clipart media");
    } finally {
      setIsLoadingAssets(false);
    }
  }

  useEffect(() => {
    if (!category?.id) {
      setAssets([]);
      setIsLoadingAssets(false);
      return;
    }
    loadAssets();
  }, [category?.id, categoryId]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Clipart", path: "/customization/clipart" },
      { label: category?.name ?? "Category", path: categoryId ? `/customization/clipart/${categoryId}` : undefined },
    ]);
    return () => setBreadcrumbs([]);
  }, [category?.name, categoryId, setBreadcrumbs]);

  const uploadDraftErrors = useMemo(() => buildUploadDraftErrors(uploadDrafts), [uploadDrafts]);
  const hasUploadDraftErrors = uploadDraftErrors.some((errors) => errors.length > 0);
  const activeAssetCount = useMemo(() => assets.filter((asset) => asset.active).length, [assets]);



  async function handleSaveCategory() {
    if (!category || !categoryNameInput.vi.trim()) return;
    setIsSavingCategory(true);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/customization/clipart/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify(toClipartNamePayload(categoryNameInput)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save clipart category");
      }
      const data = (await res.json()) as { category: ClipartCategory };
      setCategory(data.category);
      setCategoryNameInput(clipartNameToValue(data.category));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save clipart category");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleToggleCategoryActive(nextActive: boolean) {
    if (!category) return;
    setIsSavingCategory(true);
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
      const data = (await res.json()) as { category: ClipartCategory };
      setCategory(data.category);
      setCategoryNameInput(clipartNameToValue(data.category));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update clipart category");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleUploadBatch() {
    if (!categoryId || uploadDrafts.length === 0 || hasUploadDraftErrors) return;
    setIsUploadingBatch(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.set(
        "namesJson",
        JSON.stringify(uploadDrafts.map((draft) => toClipartNamePayload(draft.name))),
      );
      for (const draft of uploadDrafts) {
        formData.append("files", draft.file);
      }

      const res = await backendFetch(`/api/admin/customization/clipart/categories/${categoryId}/assets/batch`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const rowErrors = Array.isArray(data?.rowErrors)
          ? data.rowErrors
              .map((entry: { row?: number; message?: string }) =>
                typeof entry?.row === "number" && entry?.message ? `Row ${entry.row}: ${entry.message}` : null,
              )
              .filter(Boolean)
              .join(" ")
          : "";
        throw new Error(rowErrors || data?.error || "Failed to upload clipart batch");
      }

      setUploadDrafts([]);
      await loadAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload clipart batch");
    } finally {
      setIsUploadingBatch(false);
    }
  }

  async function handleRenameAsset(assetId: string) {
    if (!editingAssetName.vi.trim()) return;
    setAssetActionId(assetId);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/customization/clipart/assets/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify(toClipartNamePayload(editingAssetName)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to rename clipart asset");
      }
      setEditingAssetId(null);
      setEditingAssetName(createEmptyLocalizedText());
      await loadAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to rename clipart asset");
    } finally {
      setAssetActionId(null);
    }
  }

  async function handleDeleteAsset(asset: BrandClipartAsset) {
    if (!window.confirm(`Delete ${asset.name}?`)) return;
    setAssetActionId(asset.id);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/customization/clipart/assets/${asset.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete clipart asset");
      }
      if (editingAssetId === asset.id) {
        setEditingAssetId(null);
        setEditingAssetName(createEmptyLocalizedText());
      }
      await loadAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete clipart asset");
    } finally {
      setAssetActionId(null);
    }
  }

  function beginRename(asset: BrandClipartAsset) {
    setEditingAssetId(asset.id);
    setEditingAssetName(clipartNameToValue(asset));
  }

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!category) {
    return (
      <Container className="flex flex-col gap-4">
        <Heading level="h2">Clipart category not found</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          The selected clipart category is missing or no longer available.
        </Text>
        <div>
          <Button variant="secondary" onClick={() => navigate("/customization/clipart")}>
            Back to clipart
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ui-border-base px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-y-3">
            <div>
              <Button variant="transparent" size="small" onClick={() => navigate("/customization/clipart")} className="px-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to clipart
              </Button>
            </div>
            <div className="flex flex-col gap-y-1">
              <Heading level="h2" className="text-xl font-semibold">
                {category.name}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Manage category details, review queued uploads, and maintain the uploaded media for this category only.
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge color={category.active ? "green" : "orange"}>
              {category.active ? "Active" : "Inactive"}
            </StatusBadge>
            <Text size="small" className="text-ui-fg-subtle">
              {activeAssetCount} active / {assets.length} total
            </Text>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-ui-border-base px-4 py-4 sm:px-6">
            <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
              <Text size="small">{errorMessage}</Text>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 p-4">
          <section className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
            <div className="mb-4 flex flex-col gap-y-1">
              <Heading level="h3">Category details</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Rename the category or change whether it can accept new clipart uploads and shopper selections.
              </Text>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="grid gap-4 md:grid-cols-2">
                <LocalizedTextField
                  id="clipart-category-detail-name"
                  label="Category name"
                  value={categoryNameInput}
                  locale={categoryNameLocale}
                  onLocaleChange={setCategoryNameLocale}
                  onChange={setCategoryNameInput}
                  requiredLocales={["vi", "en"]}
                  disabled={isSavingCategory}
                />
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <div className="flex h-10 items-center">
                    <StatusBadge color={category.active ? "green" : "orange"}>
                      {category.active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSaveCategory}
                  isLoading={isSavingCategory}
                  disabled={
                    isSavingCategory ||
                    !categoryNameInput.vi.trim() ||
                    JSON.stringify(categoryNameInput) === JSON.stringify(clipartNameToValue(category))
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  Save category
                </Button>
                <Button variant="secondary" onClick={() => handleToggleCategoryActive(!category.active)} isLoading={isSavingCategory}>
                  {category.active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
            <div className="mb-4 flex flex-col gap-y-1">
              <Heading level="h3">Upload queue</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Review the current batch before upload. Selecting more files appends them to the existing queue.
              </Text>
            </div>
            <ClipartUploadQueue
              uploadDrafts={uploadDrafts}
              setUploadDrafts={setUploadDrafts}
              isUploading={isUploadingBatch}
              categoryActive={category.active}
              onUpload={handleUploadBatch}
            />
          </section>

          <section className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
            <div className="mb-4 flex flex-col gap-y-1">
              <Heading level="h3">Uploaded media</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Rename clipart, review original filenames, and control whether each asset stays available to shoppers.
              </Text>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Preview</Table.HeaderCell>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Filename</Table.HeaderCell>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Source</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                {isLoadingAssets ? (
                  <Table.Row>
                    <Table.Cell {...({ colSpan: 6 } as any)} className="py-8 text-center text-ui-fg-muted">
                      Loading media...
                    </Table.Cell>
                  </Table.Row>
                ) : assets.length === 0 ? (
                  <Table.Row>
                    <Table.Cell {...({ colSpan: 6 } as any)} className="py-8 text-center text-ui-fg-muted">
                      No clipart media uploaded for this category yet.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  assets.map((asset) => {
                    const isEditing = editingAssetId === asset.id;
                    return (
                      <Table.Row key={asset.id}>
                        <Table.Cell>
                          <MediaPreview
                            src={asset.previewUrl}
                            mimeType={asset.mimeType}
                            alt={asset.name}
                            className="h-12 w-12 rounded border border-ui-border-base bg-white object-contain"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {isEditing ? (
                            <div className="flex items-start gap-2">
                              <LocalizedTextField
                                id={`clipart-asset-name-${asset.id}`}
                                value={editingAssetName}
                                locale={editingAssetLocale}
                                onLocaleChange={setEditingAssetLocale}
                                onChange={setEditingAssetName}
                                requiredLocales={["vi"]}
                                disabled={assetActionId === asset.id}
                              />
                              <Button
                                size="small"
                                onClick={() => handleRenameAsset(asset.id)}
                                isLoading={assetActionId === asset.id}
                                disabled={!editingAssetName.vi.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => {
                                  setEditingAssetId(null);
                                  setEditingAssetName(createEmptyLocalizedText());
                                }}
                                disabled={assetActionId === asset.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Text size="small" weight="plus" title={asset.name}>
                              {asset.name}
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" title={asset.fileName || "Unknown"}>
                            {asset.fileName || "Unknown"}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{formatClipartMimeType(asset.mimeType)}</Table.Cell>
                        <Table.Cell>
                          {asset.sourceWidthPx && asset.sourceHeightPx
                            ? `${asset.sourceWidthPx}x${asset.sourceHeightPx}`
                            : "Unknown"}
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="small" onClick={() => beginRename(asset)} disabled={assetActionId === asset.id}>
                              <PenSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => handleDeleteAsset(asset)}
                              isLoading={assetActionId === asset.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
                </Table.Body>
              </Table>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
