import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Button,
  Checkbox,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Text,
  Select,
  StatusBadge,
} from "@medusajs/ui";
import { ArrowLeft, Eye, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { ArticleTipTapEditor } from "../components/articles/article-tiptap-editor";
import { ProductLinkPicker } from "../components/articles/product-link-picker";
import { LocalizedTextField, createLocalizedText } from "../components/ui/medusa/localized-field";
import type { AdminLocale, LocalizedTextValue } from "../types";
import {
  createArticle,
  deleteArticle,
  fetchArticle,
  fetchArticleCategories,
  updateArticle,
  type Article,
  type ArticleCategory,
} from "../lib/articles-client";
import { uploadProductVariantMedia } from "../lib/product-assets-client";
import { cn } from "../lib/utils";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
] as const;

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  contentJson: string | null;
  status: "draft" | "published" | "scheduled";
  featured: boolean;
  publishedAt: number | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  categoryIds: string[];
  productIds: number[];
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string | null;
  canonicalUrl: string;
};

function toFormState(article?: Article | null): FormState {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    contentHtml: article?.contentHtml ?? "",
    contentJson: article?.contentJson ?? null,
    status: article?.status ?? "draft",
    featured: article?.featured ?? false,
    publishedAt: article?.publishedAt ?? null,
    featuredImageUrl: article?.featuredImageUrl ?? null,
    featuredImageAlt: article?.featuredImageAlt ?? "",
    categoryIds: article?.categories.map((c) => c.id) ?? [],
    productIds: article?.productIds ?? [],
    metaTitle: article?.metaTitle ?? "",
    metaDescription: article?.metaDescription ?? "",
    ogImageUrl: article?.ogImageUrl ?? null,
    canonicalUrl: article?.canonicalUrl ?? "",
  };
}

type TranslationsState = {
  title: LocalizedTextValue;
  excerpt: LocalizedTextValue;
  contentHtml: LocalizedTextValue;
  contentJson: LocalizedTextValue;
  featuredImageAlt: LocalizedTextValue;
  metaTitle: LocalizedTextValue;
  metaDescription: LocalizedTextValue;
};

function toTranslationsState(article?: Article | null): TranslationsState {
  return {
    title: article?.titleTranslations ?? createLocalizedText(article?.title ?? ""),
    excerpt: article?.excerptTranslations ?? createLocalizedText(article?.excerpt ?? ""),
    contentHtml: article?.contentHtmlTranslations ?? createLocalizedText(article?.contentHtml ?? ""),
    contentJson: article?.contentJsonTranslations ?? createLocalizedText(article?.contentJson ?? ""),
    featuredImageAlt: article?.featuredImageAltTranslations ?? createLocalizedText(article?.featuredImageAlt ?? ""),
    metaTitle: article?.metaTitleTranslations ?? createLocalizedText(article?.metaTitle ?? ""),
    metaDescription: article?.metaDescriptionTranslations ?? createLocalizedText(article?.metaDescription ?? ""),
  };
}

function toDatetimeLocal(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function trimLocalizedValue(value: LocalizedTextValue): LocalizedTextValue {
  return { vi: value.vi.trim(), en: value.en.trim() };
}

const slugifyClient = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");

export function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new" || !id;

  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [form, setForm] = useState<FormState>(() => toFormState(null));
  const [translations, setTranslations] = useState<TranslationsState>(() => toTranslationsState(null));
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [excerptLocale, setExcerptLocale] = useState<AdminLocale>("vi");
  const [featuredImageAltLocale, setFeaturedImageAltLocale] = useState<AdminLocale>("vi");
  const [metaTitleLocale, setMetaTitleLocale] = useState<AdminLocale>("vi");
  const [metaDescriptionLocale, setMetaDescriptionLocale] = useState<AdminLocale>("vi");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [featuredUploading, setFeaturedUploading] = useState(false);

  useEffect(() => {
    fetchArticleCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(toFormState(null));
      setTranslations(toTranslationsState(null));
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchArticle(id!)
      .then((a) => {
        setArticle(a);
        setForm(toFormState(a));
        setTranslations(toTranslationsState(a));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load article"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Auto-generate slug from the Vietnamese title until the operator edits it manually
  useEffect(() => {
    if (slugTouched || loading || isNew === false) return;
    if (form.title.trim()) {
      const generated = slugifyClient(form.title);
      setForm((current) => ({ ...current, slug: generated }));
    }
  }, [form.title, slugTouched, loading, isNew]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * Updates a bilingual `*Translations` value and keeps the canonical (VI) form
   * field in sync, so slug generation, SEO preview and the draft preview always
   * reflect the Vietnamese draft.
   */
  const setTranslation = <K extends keyof TranslationsState>(key: K, value: LocalizedTextValue) => {
    setTranslations((current) => ({ ...current, [key]: value }));
    if (key === "title") setForm((current) => ({ ...current, title: value.vi }));
    if (key === "excerpt") setForm((current) => ({ ...current, excerpt: value.vi }));
    if (key === "contentHtml") setForm((current) => ({ ...current, contentHtml: value.vi }));
    if (key === "contentJson") setForm((current) => ({ ...current, contentJson: value.vi }));
    if (key === "featuredImageAlt") setForm((current) => ({ ...current, featuredImageAlt: value.vi }));
    if (key === "metaTitle") setForm((current) => ({ ...current, metaTitle: value.vi }));
    if (key === "metaDescription") setForm((current) => ({ ...current, metaDescription: value.vi }));
  };

  const metaTitleCount = useMemo(() => translations.metaTitle[metaTitleLocale].length, [translations.metaTitle, metaTitleLocale]);
  const metaDescriptionCount = useMemo(() => translations.metaDescription[metaDescriptionLocale].length, [translations.metaDescription, metaDescriptionLocale]);
  const excerptCount = useMemo(() => translations.excerpt[excerptLocale].length, [translations.excerpt, excerptLocale]);

  async function persist(status: FormState["status"]) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        contentHtml: form.contentHtml,
        contentJson: form.contentJson ?? undefined,
        status,
        featured: form.featured,
        publishedAt: form.publishedAt ?? undefined,
        featuredImageUrl: form.featuredImageUrl ?? undefined,
        featuredImageAlt: form.featuredImageAlt.trim() || undefined,
        categoryIds: form.categoryIds,
        productIds: form.productIds,
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        ogImageUrl: form.ogImageUrl ?? undefined,
        canonicalUrl: form.canonicalUrl.trim() || undefined,
        titleTranslations: trimLocalizedValue(translations.title),
        excerptTranslations: trimLocalizedValue(translations.excerpt),
        contentHtmlTranslations: translations.contentHtml,
        contentJsonTranslations: translations.contentJson,
        featuredImageAltTranslations: trimLocalizedValue(translations.featuredImageAlt),
        metaTitleTranslations: trimLocalizedValue(translations.metaTitle),
        metaDescriptionTranslations: trimLocalizedValue(translations.metaDescription),
      };

      const saved = isNew
        ? await createArticle(payload)
        : await updateArticle(id!, payload);

      setArticle(saved);
      setForm(toFormState(saved));
      setTranslations(toTranslationsState(saved));
      setSlugTouched(true);
      if (isNew) {
        navigate(`/articles/${saved.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  async function handleFeaturedUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Featured image must be an image file.");
      return;
    }
    setFeaturedUploading(true);
    setError(null);
    try {
      const asset = await uploadProductVariantMedia(file);
      set("featuredImageUrl", asset.contentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload featured image");
    } finally {
      setFeaturedUploading(false);
    }
  }

  async function handleDelete() {
    if (!article || !window.confirm(`Delete article "${article.title}"?`)) return;
    try {
      await deleteArticle(article.id);
      navigate("/articles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete article");
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center gap-2 py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-ui-fg-muted" />
          <Text size="small" className="text-ui-fg-muted">Loading article...</Text>
        </div>
      </Container>
    );
  }

  const seoTitle = form.metaTitle.trim() || form.title.trim();
  const seoDesc = form.metaDescription.trim() || form.excerpt.trim();
  const previewCategories = categories.filter((c) => form.categoryIds.includes(c.id));
  const previewDate = form.publishedAt
    ? new Date(form.publishedAt).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col gap-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <Button variant="transparent" size="small" asChild>
            <Link to="/articles">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <Heading level="h2">{isNew ? "New article" : "Edit article"}</Heading>
            {article ? (
              <StatusBadge color={article.status === "published" ? "green" : article.status === "scheduled" ? "orange" : "grey"}>
                {article.status}
              </StatusBadge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-x-2">
          {!isNew && article ? (
            <Button variant="danger" size="small" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button size="small" onClick={() => void persist(form.status)} isLoading={saving}>
            Save
          </Button>
        </div>
      </div>

      {error ? (
        <Container className="p-0">
          <Text size="small" className="text-ui-fg-error px-4 py-3">{error}</Text>
        </Container>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left pane ── */}
        <div className="flex min-w-0 flex-col gap-y-6">
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                Content
              </Text>
            </div>
            <div className="flex flex-col gap-y-4 px-6 py-5">
              <div className="flex flex-col gap-2">
                <LocalizedTextField
                  id="article-title"
                  label="Title"
                  value={translations.title}
                  locale={titleLocale}
                  onLocaleChange={setTitleLocale}
                  onChange={(v) => setTranslation("title", v)}
                  placeholder={{ vi: "Tiêu đề bài viết", en: "Article title" }}
                  requiredLocales={["vi"]}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="article-slug">Slug</Label>
                <Input
                  id="article-slug"
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                  placeholder="duong-dan-bai-viet"
                />
                <Text size="xsmall" className="text-ui-fg-muted">
                  Will appear at /news/{form.slug || "..."}
                </Text>
              </div>

              <div className="flex flex-col gap-2">
                <ArticleTipTapEditor
                  key={id ?? "new"}
                  valueByLocale={{
                    vi: { html: translations.contentHtml.vi, json: translations.contentJson.vi || null },
                    en: { html: translations.contentHtml.en, json: translations.contentJson.en || null },
                  }}
                  onChangeByLocale={(locale, v) => {
                    setTranslations((current) => ({
                      ...current,
                      contentHtml: { ...current.contentHtml, [locale]: v.html },
                      contentJson: { ...current.contentJson, [locale]: v.json ?? "" },
                    }));
                    if (locale === "vi") {
                      setForm((current) => ({ ...current, contentHtml: v.html, contentJson: v.json ?? null }));
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="article-excerpt">Excerpt</Label>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {excerptCount} / 1000
                  </Text>
                </div>
                <LocalizedTextField
                  id="article-excerpt"
                  value={translations.excerpt}
                  locale={excerptLocale}
                  onLocaleChange={setExcerptLocale}
                  onChange={(v) => setTranslation("excerpt", v)}
                  placeholder={{ vi: "Tóm tắt ngắn hiển thị trên thẻ bài viết.", en: "Short summary shown on the article card." }}
                  requiredLocales={["vi"]}
                  multiline
                  rows={3}
                />
              </div>
            </div>
          </Container>
        </div>

        {/* ── Right pane ── */}
        <div className="flex min-w-0 flex-col gap-y-6">
          {/* Publish card */}
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                Publish
              </Text>
            </div>
            <div className="flex flex-col gap-y-4 px-6 py-5">
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as FormState["status"])}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {STATUS_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {form.status === "scheduled" ? (
                  <div className="flex flex-col gap-1.5">
                    <Label>Publish at</Label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(form.publishedAt)}
                      onChange={(e) => set("publishedAt", fromDatetimeLocal(e.target.value))}
                      className="h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm text-ui-fg-base outline-none transition-fg focus-visible:shadow-borders-focus"
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <Text size="small" className="font-medium">Featured</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Pin to the top of the news listing with a badge.
                  </Text>
                </div>
                <Checkbox
                  checked={form.featured}
                  onCheckedChange={(checked) => set("featured", checked === true)}
                />
              </div>
              <Button variant="secondary" size="small" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </div>
          </Container>

          {/* Featured media card */}
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                Featured media
              </Text>
            </div>
            <div className="flex flex-col gap-y-4 px-6 py-5">
              {form.featuredImageUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-md bg-ui-bg-subtle">
                  <img src={form.featuredImageUrl} alt={form.featuredImageAlt} className="h-full w-full object-cover" />
                  <Button
                    variant="danger"
                    size="small"
                    className="absolute right-2 top-2"
                    onClick={() => { set("featuredImageUrl", null); set("featuredImageAlt", ""); }}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
              ) : (
                <label className={cn(
                  "flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ui-border-strong text-ui-fg-muted transition-colors hover:bg-ui-bg-subtle-hover",
                  featuredUploading && "opacity-60 pointer-events-none",
                )}>
                  {featuredUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  <Text size="small" className="text-ui-fg-muted">
                    {featuredUploading ? "Uploading..." : "Upload 16:9 image"}
                  </Text>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={featuredUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFeaturedUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <div className="flex flex-col gap-2">
                <LocalizedTextField
                  id="featured-alt"
                  label="Alt text"
                  value={translations.featuredImageAlt}
                  locale={featuredImageAltLocale}
                  onLocaleChange={setFeaturedImageAltLocale}
                  onChange={(v) => setTranslation("featuredImageAlt", v)}
                  placeholder={{ vi: "Mô tả ngắn cho ảnh", en: "Short alt text for the image" }}
                  requiredLocales={["vi"]}
                />
              </div>
            </div>
          </Container>

          {/* Taxonomy card */}
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                Categories
              </Text>
            </div>
            <div className="flex flex-col gap-y-2 px-6 py-5">
              {categories.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">No categories available.</Text>
              ) : (
                categories.map((cat) => {
                  const selected = form.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        set("categoryIds", selected
                          ? form.categoryIds.filter((x) => x !== cat.id)
                          : [...form.categoryIds, cat.id])
                      }
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                        selected ? "border-ui-border-interactive bg-ui-bg-subtle" : "border-ui-border-base hover:bg-ui-bg-subtle-hover",
                      )}
                    >
                      <Text size="small" className="font-medium">{cat.name}</Text>
                      <Text size="xsmall" className="text-ui-fg-muted">{cat.articleCount} articles</Text>
                    </button>
                  );
                })
              )}
            </div>
          </Container>

          {/* Related products card */}
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4 flex items-center justify-between">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                Related products
              </Text>
              <Button variant="secondary" size="small" onClick={() => setPickerOpen(true)}>
                {form.productIds.length > 0 ? `Edit (${form.productIds.length})` : "Add products"}
              </Button>
            </div>
            <div className="px-6 py-5">
              {form.productIds.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No products linked yet.
                </Text>
              ) : (
                <Text size="small" className="text-ui-fg-subtle">
                  {form.productIds.length} product{form.productIds.length > 1 ? "s" : ""} linked.
                </Text>
              )}
            </div>
          </Container>

          {/* SEO card */}
          <Container className="p-0">
            <div className="border-b border-ui-border px-6 py-4">
              <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
                SEO
              </Text>
            </div>
            <div className="flex flex-col gap-y-4 px-6 py-5">
              {/* SERP preview */}
              <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text size="xsmall" className="text-ui-fg-success truncate">
                  trophy.local › news › {form.slug}
                </Text>
                <Text size="small" className="mt-1 block truncate font-medium text-ui-fg-link">
                  {seoTitle || "Article title"}
                </Text>
                <Text size="xsmall" className="mt-1 line-clamp-2 text-ui-fg-muted">
                  {seoDesc || "Article description appears here."}
                </Text>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta-title">Meta title</Label>
                  <Text size="xsmall" className={cn(metaTitleCount > 60 && "text-ui-fg-error")}>
                    {metaTitleCount} / 60
                  </Text>
                </div>
                <LocalizedTextField
                  id="meta-title"
                  value={translations.metaTitle}
                  locale={metaTitleLocale}
                  onLocaleChange={setMetaTitleLocale}
                  onChange={(v) => setTranslation("metaTitle", v)}
                  placeholder={{ vi: form.title || "Meta title", en: translations.title.en || "Meta title" }}
                  requiredLocales={["vi"]}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta-desc">Meta description</Label>
                  <Text size="xsmall" className={cn((metaDescriptionCount < 140 || metaDescriptionCount > 160) && "text-ui-fg-warning")}>
                    {metaDescriptionCount} / 140-160
                  </Text>
                </div>
                <LocalizedTextField
                  id="meta-desc"
                  value={translations.metaDescription}
                  locale={metaDescriptionLocale}
                  onLocaleChange={setMetaDescriptionLocale}
                  onChange={(v) => setTranslation("metaDescription", v)}
                  placeholder={{ vi: "Mô tả hiển thị trên kết quả tìm kiếm.", en: "Description shown on search results." }}
                  requiredLocales={["vi"]}
                  multiline
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="seo-og">Social image URL</Label>
                <Input
                  id="seo-og"
                  value={form.ogImageUrl ?? ""}
                  onChange={(e) => set("ogImageUrl", e.target.value || null)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="seo-canonical">Canonical URL</Label>
                <Input
                  id="seo-canonical"
                  value={form.canonicalUrl}
                  onChange={(e) => set("canonicalUrl", e.target.value)}
                  placeholder="https://trophy.local/news/..."
                />
              </div>
            </div>
          </Container>
        </div>
      </div>

      <ProductLinkPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={form.productIds}
        onSave={(ids) => set("productIds", ids)}
      />

      <FocusModal open={previewOpen} onOpenChange={setPreviewOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Preview</FocusModal.Title>
            <FocusModal.Description className="sr-only">
              Preview of the article as it appears on the storefront.
            </FocusModal.Description>
          </FocusModal.Header>
          <FocusModal.Body className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
            {form.featuredImageUrl ? (
              <img
                src={form.featuredImageUrl}
                alt={form.featuredImageAlt || form.title}
                className="aspect-video w-full rounded-md object-cover"
              />
            ) : null}
            <div className="flex flex-col gap-3 pt-6">
              <Heading level="h1">{form.title || "Untitled article"}</Heading>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {previewCategories.map((cat) => (
                  <Text key={cat.id} size="small" className="text-ui-fg-muted">{cat.name}</Text>
                ))}
                {form.status === "draft" ? (
                  <StatusBadge color="grey">Draft</StatusBadge>
                ) : form.status === "scheduled" ? (
                  <StatusBadge color="orange">Scheduled</StatusBadge>
                ) : (
                  <StatusBadge color="green">Published</StatusBadge>
                )}
                {previewDate ? (
                  <Text size="small" className="text-ui-fg-muted">{previewDate}</Text>
                ) : null}
              </div>
              {form.excerpt ? (
                <Text size="base" className="text-ui-fg-subtle">{form.excerpt}</Text>
              ) : null}
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: form.contentHtml }}
              />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <FocusModal.Close asChild>
              <Button variant="secondary">Close</Button>
            </FocusModal.Close>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </div>
  );
}
