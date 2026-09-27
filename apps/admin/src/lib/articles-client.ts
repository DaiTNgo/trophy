import { backendFetch } from "./fetch";
import type { LocalizedTextValue } from "../types";

export type ArticleCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  nameTranslations?: LocalizedTextValue;
  descriptionTranslations?: LocalizedTextValue;
  displayOrder: number;
  articleCount: number;
};

export type ArticleAuthor = {
  name: string;
  username: string | null;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  contentJson: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  status: "draft" | "published" | "scheduled";
  featured: boolean;
  author: ArticleAuthor | null;
  publishedAt: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  viewCount: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  productIds: number[];
  titleTranslations?: LocalizedTextValue;
  excerptTranslations?: LocalizedTextValue;
  contentHtmlTranslations?: LocalizedTextValue;
  contentJsonTranslations?: LocalizedTextValue;
  featuredImageAltTranslations?: LocalizedTextValue;
  metaTitleTranslations?: LocalizedTextValue;
  metaDescriptionTranslations?: LocalizedTextValue;
  createdAt: number;
  updatedAt: number;
};

export type ArticleListParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: "draft" | "published" | "scheduled";
  category?: string;
};

type ListResponse = {
  items: Article[];
  page: number;
  limit: number;
  total: number;
};

type ErrorResponse = { error?: string };

export async function fetchArticleCategories(): Promise<ArticleCategory[]> {
  const res = await backendFetch("/api/admin/article-categories");
  const body = (await res.json().catch(() => null)) as
    | { items?: ArticleCategory[] }
    | ErrorResponse
    | null;
  if (!res.ok || !body || !("items" in body)) {
    throw new Error((body as ErrorResponse)?.error || "Unable to fetch article categories.");
  }
  return body.items!;
}

export async function fetchArticles(params: ArticleListParams = {}): Promise<ListResponse> {
  const url = new URL("/api/admin/articles", "http://localhost");
  if (params.page !== undefined) url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params.q) url.searchParams.set("q", params.q);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await backendFetch(url.pathname + url.search);
  const body = (await res.json().catch(() => null)) as ListResponse | ErrorResponse | null;
  if (!res.ok || !body || !("items" in body)) {
    throw new Error((body as ErrorResponse)?.error || "Unable to fetch articles.");
  }
  return body;
}

export async function fetchArticle(id: string): Promise<Article> {
  const res = await backendFetch(`/api/admin/articles/${id}`);
  const body = (await res.json().catch(() => null)) as Article | ErrorResponse | null;
  if (!res.ok || !body || !("id" in body)) {
    throw new Error((body as ErrorResponse)?.error || "Unable to fetch article.");
  }
  return body;
}

export type CreateArticleInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml?: string;
  contentJson?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  status?: "draft" | "published" | "scheduled";
  featured?: boolean;
  publishedAt?: number;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  categoryIds?: string[];
  productIds?: number[];
  titleTranslations?: LocalizedTextValue;
  excerptTranslations?: LocalizedTextValue;
  contentHtmlTranslations?: LocalizedTextValue;
  contentJsonTranslations?: LocalizedTextValue;
  featuredImageAltTranslations?: LocalizedTextValue;
  metaTitleTranslations?: LocalizedTextValue;
  metaDescriptionTranslations?: LocalizedTextValue;
};

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const res = await backendFetch("/api/admin/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => null)) as Article | ErrorResponse | null;
  if (!res.ok || !body || !("id" in body)) {
    throw new Error((body as ErrorResponse)?.error || "Unable to create article.");
  }
  return body;
}

export async function updateArticle(
  id: string,
  input: Partial<CreateArticleInput>,
): Promise<Article> {
  const res = await backendFetch(`/api/admin/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => null)) as Article | ErrorResponse | null;
  if (!res.ok || !body || !("id" in body)) {
    throw new Error((body as ErrorResponse)?.error || "Unable to update article.");
  }
  return body;
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await backendFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
  const body = (await res.json().catch(() => null)) as ErrorResponse | null;
  if (!res.ok) throw new Error(body?.error || "Unable to delete article.");
}
