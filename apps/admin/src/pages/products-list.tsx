import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Button,
  Container,
  Input,
  Table,
  Text,
  DropdownMenu,
  IconButton,
  StatusBadge,
} from "@medusajs/ui";
import { Plus, MoreHorizontal, ArrowUpDown, X, Check, Trash2, Pencil } from "lucide-react";
import {
  fetchProducts,
  deleteProduct,
  mapApiProductToCatalogProduct,
} from "../lib/products-client";
import type { CatalogProduct } from "../types";
import {EllipseMiniSolid} from "@medusajs/icons";

const PAGE_SIZE = 15;

export function ProductsListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(product: CatalogProduct) {
    if (!window.confirm(`Move ${product.title.vi || product.title.en || "this product"} to trash?`)) return;
    setDeletingId(product.id);
    setError(null);
    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  }

  const deferredQuery = useDeferredValue(query);
  const flash = (location.state as { flash?: string } | null)?.flash;

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProducts();
        setProducts(data.map(mapApiProductToCatalogProduct));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load products",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (statusFilter.length > 0) {
      result = result.filter(product => statusFilter.includes(product.status));
    }

    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((product) =>
        [
          product.id,
          product.title?.vi || "",
          product.title?.en || "",
          product.status,
          product.category,
          product.collection,
          product.handle,
        ].some((value) => value.toLowerCase().includes(normalizedQuery)),
      );
    }

    return result;
  }, [deferredQuery, products, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pageStart = pageIndex * PAGE_SIZE;
  const paginatedProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex + 1 < pageCount;

  useEffect(() => {
    setPageIndex(0);
  }, [deferredQuery, statusFilter, sortOrder]);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return (
    <div className="flex flex-col gap-y-6">
      {/* <Container>
        <div className="flex flex-col gap-y-3">
          <Text
            size="small"
            className="text-ui-fg-muted uppercase tracking-wider"
          >
            Products
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">Catalog control</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Track publish state, inventory pressure, and pricing across the
                current assortment.
              </Text>
            </div>
            <Button variant="secondary" size="small" asChild>
              <Link to="/products/new">
                <Plus className="h-4 w-4" />
                Create product
              </Link>
            </Button>
          </div>
        </div>
      </Container> */}

      {flash ? (
        <Container>
          <Text size="small" className="text-ui-fg-success">
            {flash}
          </Text>
        </Container>
      ) : null}

      {error ? (
        <Container>
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        </Container>
      ) : null}

      <Container className="p-0 overflow-hidden">
        <div className="flex justify-between border-b border-ui-border px-6 py-4">
          <Text
            size="small"
            className="uppercase tracking-wider font-sans font-medium h1-core"
          >
            Products
          </Text>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" asChild>
              <Link to="/products/trash">Trash</Link>
            </Button>
            <Button variant="secondary" size="small" asChild>
              <Link to="/products/new">
                <Plus className="h-4 w-4" />
                Create product
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-2 flex-wrap">
            {activeFilters.includes("status") && (
              <div className="flex items-center rounded-md border border-ui-border-base shadow-sm text-sm overflow-hidden bg-ui-bg-base">
                <div className="px-2 py-1 font-medium bg-ui-bg-subtle border-r border-ui-border-base">Status</div>
                <div className="px-2 py-1 text-ui-fg-muted border-r border-ui-border-base">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="px-2 py-1 hover:bg-ui-bg-subtle-hover flex items-center gap-x-1 outline-none text-ui-fg-base cursor-pointer">
                    <span className="truncate max-w-[200px]">
                      {statusFilter.length > 0 ? statusFilter.join(", ") : "Select..."}
                    </span>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {["Draft", "Proposed", "Published", "Rejected"].map((s) => (
                      <DropdownMenu.Item 
                        key={s} 
                        onClick={(e) => {
                          e.preventDefault();
                          setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        }}
                      >
                        <div className="flex items-center gap-x-2">
                          <Check className={statusFilter.includes(s) ? "visible h-4 w-4" : "invisible h-4 w-4"} />
                          <span>{s}</span>
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button 
                  className="px-2 py-1 hover:bg-ui-bg-subtle-hover text-ui-fg-muted hover:text-ui-fg-base border-l border-ui-border-base transition-colors"
                  onClick={() => {
                    setActiveFilters(prev => prev.filter(f => f !== "status"));
                    setStatusFilter([]);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small" className={activeFilters.length > 0 ? "border-dashed" : ""}>
                  Add filter
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {!activeFilters.includes("status") && (
                  <DropdownMenu.Item onClick={() => setActiveFilters(prev => [...prev, "status"])}>
                    Status
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu>

            {activeFilters.length > 0 && (
              <Button 
                variant="transparent" 
                size="small" 
                className="text-ui-fg-muted hover:text-ui-fg-base"
                onClick={() => {
                  setActiveFilters([]);
                  setStatusFilter([]);
                }}
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
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <IconButton variant="transparent" size="small">
                  <ArrowUpDown className="text-ui-fg-muted h-4 w-4" />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item>
                  <div className="flex items-center gap-x-2">
                    <EllipseMiniSolid className="visible" />
                    <span>Title</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => setSortOrder("asc")}>
                  <div className="flex items-center justify-between w-full gap-8">
                    <div className="flex items-center gap-x-2">
                      <EllipseMiniSolid className={sortOrder === "asc" ? "visible" : "invisible"} />
                      <span className={sortOrder === "asc" ? "font-medium" : ""}>Ascending</span>
                    </div>
                    <span className="text-ui-fg-muted">1 - 30</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortOrder("desc")}>
                  <div className="flex items-center justify-between w-full gap-8">
                    <div className="flex items-center gap-x-2">
                      <EllipseMiniSolid className={sortOrder === "desc" ? "visible" : "invisible"} />
                      <span className={sortOrder === "desc" ? "font-medium" : ""}>Descending</span>
                    </div>
                    <span className="text-ui-fg-muted">30 - 1</span>
                  </div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                Loading products...
              </Text>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                No products matched your current search.
              </Text>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Product</Table.HeaderCell>
                    <Table.HeaderCell>Variants</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell className="w-10"></Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedProducts.map((product) => (
                    <Table.Row key={product.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-x-3">
                          {product.media?.[0] && (
                            <div className="h-8 w-6 overflow-hidden rounded bg-ui-bg-subtle flex-shrink-0">
                              <img
                                src={product.media[0].contentUrl}
                                alt={product.title?.vi || product.title?.en}
                                className="h-full w-full object-cover"
                                crossOrigin="anonymous"
                              />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <Link
                              to={`/products/${product.id}`}
                              className="text-ui-fg-base font-medium"
                            >
                              {product.title?.vi || product.title?.en}
                            </Link>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small" className="text-ui-fg-subtle">
                          {product.variants
                            ? `${product.variants.length} variants`
                            : "4 variants"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge color={product.status === "Published" ? "green" : "grey"}>
                          {product.status}
                        </StatusBadge>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <IconButton variant="transparent" size="small">
                              <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end">
                            <DropdownMenu.Item onClick={() => navigate(`/products/${product.id}`)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="text-ui-fg-error" disabled={deletingId === product.id} onClick={() => void handleDelete(product)}>
                              <Trash2 className="h-4 w-4" />
                              Move to trash
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
          {!isLoading && filteredProducts.length > 0 && (
            <Table.Pagination
              count={filteredProducts.length}
              pageSize={PAGE_SIZE}
              pageIndex={pageIndex}
              pageCount={pageCount}
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              previousPage={() => setPageIndex((current) => Math.max(0, current - 1))}
              nextPage={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            />
          )}
        </div>
      </Container>
    </div>
  );
}
