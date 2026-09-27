import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Badge,
  Button,
  Container,
  Input,
  Table,
  Text,
  DropdownMenu,
  IconButton,
  StatusBadge,
} from "@medusajs/ui";
import {
  Plus,
  MoreHorizontal,
  Check,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  deleteArticle,
  fetchArticleCategories,
  fetchArticles,
  type Article,
  type ArticleCategory,
  type ArticleListParams,
} from "../lib/articles-client";

const PAGE_SIZE = 15;

const STATUS_META: Record<Article["status"], { label: string; color: "green" | "grey" | "orange" }> = {
  published: { label: "Published", color: "green" },
  draft: { label: "Draft", color: "grey" },
  scheduled: { label: "Scheduled", color: "orange" },
};

export function ArticlesListPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Article["status"]>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchArticleCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [query, statusFilter, categoryFilter]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params: ArticleListParams = {
      page: pageIndex + 1,
      limit: PAGE_SIZE,
    };
    if (query.trim()) params.q = query.trim();
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;

    fetchArticles(params)
      .then((data) => {
        if (cancelled) return;
        setArticles(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load articles");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageIndex, query, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(query.trim() || statusFilter || categoryFilter);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
    setCategoryFilter("");
  };

  async function handleDelete(article: Article) {
    if (!window.confirm(`Delete article "${article.title}"?`)) return;
    setDeletingId(article.id);
    setError(null);
    try {
      await deleteArticle(article.id);
      setArticles((current) => current.filter((a) => a.id !== article.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete article");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      {error ? (
        <Container>
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        </Container>
      ) : null}

      <Container className="p-0 overflow-hidden">
        <div className="flex justify-between border-b border-ui-border px-6 py-4">
          <Text size="small" className="uppercase tracking-wider font-sans font-medium h1-core">
            News
          </Text>
          <Button variant="secondary" size="small" asChild>
            <Link to="/articles/new">
              <Plus className="h-4 w-4" />
              New article
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-2 flex-wrap">
            {statusFilter && (
              <div className="flex items-center rounded-md border border-ui-border-base shadow-sm text-sm overflow-hidden bg-ui-bg-base">
                <div className="px-2 py-1 font-medium bg-ui-bg-subtle border-r border-ui-border-base">Status</div>
                <div className="px-2 py-1 text-ui-fg-muted border-r border-ui-border-base">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="px-2 py-1 hover:bg-ui-bg-subtle-hover flex items-center gap-x-1 outline-none text-ui-fg-base cursor-pointer">
                    <span>{STATUS_META[statusFilter].label}</span>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {(["draft", "published", "scheduled"] as const).map((s) => (
                      <DropdownMenu.Item
                        key={s}
                        onClick={(e) => {
                          e.preventDefault();
                          setStatusFilter(s);
                        }}
                      >
                        <div className="flex items-center gap-x-2">
                          <Check className={statusFilter === s ? "visible h-4 w-4" : "invisible h-4 w-4"} />
                          <span>{STATUS_META[s].label}</span>
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button
                  className="px-2 py-1 hover:bg-ui-bg-subtle-hover text-ui-fg-muted hover:text-ui-fg-base border-l border-ui-border-base transition-colors"
                  onClick={() => setStatusFilter("")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {categoryFilter && (
              <div className="flex items-center rounded-md border border-ui-border-base shadow-sm text-sm overflow-hidden bg-ui-bg-base">
                <div className="px-2 py-1 font-medium bg-ui-bg-subtle border-r border-ui-border-base">Category</div>
                <div className="px-2 py-1 text-ui-fg-muted border-r border-ui-border-base">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="px-2 py-1 hover:bg-ui-bg-subtle-hover flex items-center gap-x-1 outline-none text-ui-fg-base cursor-pointer">
                    <span>{categories.find((c) => c.slug === categoryFilter)?.name ?? categoryFilter}</span>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {categories.map((c) => (
                      <DropdownMenu.Item
                        key={c.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setCategoryFilter(c.slug);
                        }}
                      >
                        <div className="flex items-center gap-x-2">
                          <Check className={categoryFilter === c.slug ? "visible h-4 w-4" : "invisible h-4 w-4"} />
                          <span>{c.name}</span>
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button
                  className="px-2 py-1 hover:bg-ui-bg-subtle-hover text-ui-fg-muted hover:text-ui-fg-base border-l border-ui-border-base transition-colors"
                  onClick={() => setCategoryFilter("")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {!statusFilter && !categoryFilter && (
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <Button variant="secondary" size="small" className="border-dashed">
                    Add filter
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onClick={() => setStatusFilter("draft")}>Status</DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => setCategoryFilter(categories[0]?.slug ?? "")}>Category</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            )}

            {hasFilters && (
              <Button
                variant="transparent"
                size="small"
                className="text-ui-fg-muted hover:text-ui-fg-base"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="flex items-center gap-x-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full sm:w-64"
              size="small"
            />
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                Loading articles...
              </Text>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                No articles matched your current search.
              </Text>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Title</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Author</Table.HeaderCell>
                    <Table.HeaderCell>Updated</Table.HeaderCell>
                    <Table.HeaderCell className="w-10"></Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {articles.map((article) => {
                    const meta = STATUS_META[article.status] ?? STATUS_META.draft;
                    return (
                      <Table.Row key={article.id}>
                        <Table.Cell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/articles/${article.id}`}
                                className="text-ui-fg-base font-medium"
                              >
                                {article.title}
                              </Link>
                              {article.featured ? (
                                <Badge size="2xsmall" color="purple">Featured</Badge>
                              ) : null}
                            </div>
                            <Text size="small" className="text-ui-fg-muted">
                              /{article.slug}
                            </Text>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <StatusBadge color={meta.color}>{meta.label}</StatusBadge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" className="text-ui-fg-subtle">
                            {article.author?.name ?? "—"}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" className="text-ui-fg-subtle">
                            {new Date(article.updatedAt).toLocaleDateString()}
                          </Text>
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <DropdownMenu>
                            <DropdownMenu.Trigger asChild>
                              <IconButton variant="transparent" size="small">
                                <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                              </IconButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end">
                              <DropdownMenu.Item onClick={() => navigate(`/articles/${article.id}`)}>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="text-ui-fg-error"
                                disabled={deletingId === article.id}
                                onClick={() => void handleDelete(article)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
          {!isLoading && total > 0 && (
            <Table.Pagination
              count={total}
              pageSize={PAGE_SIZE}
              pageIndex={pageIndex}
              pageCount={pageCount}
              canPreviousPage={pageIndex > 0}
              canNextPage={pageIndex + 1 < pageCount}
              previousPage={() => setPageIndex((current) => Math.max(0, current - 1))}
              nextPage={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            />
          )}
        </div>
      </Container>
    </div>
  );
}
