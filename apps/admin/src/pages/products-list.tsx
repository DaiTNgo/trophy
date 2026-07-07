import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
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
import { Plus, MoreHorizontal, ArrowUpDown, X, Check } from "lucide-react";
import {
  fetchProducts,
  mapApiProductToCatalogProduct,
} from "../lib/products-client";
import type { CatalogProduct } from "../types";
import {EllipseMiniSolid} from "@medusajs/icons";

export function ProductsListPage() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [createdFilter, setCreatedFilter] = useState<string | null>(null);
  const [updatedFilter, setUpdatedFilter] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Created filter logic would typically go here based on dates, 
    // but we'll leave it as a UI placeholder or basic filter since mock data lacks dates.

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
          <Button variant="secondary" size="small" asChild>
            <Link to="/products/new">
              <Plus className="h-4 w-4" />
              Create product
            </Link>
          </Button>
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

            {activeFilters.includes("created") && (
              <div className="flex items-center rounded-md border border-ui-border-base shadow-sm text-sm overflow-hidden bg-ui-bg-base">
                <div className="px-2 py-1 font-medium bg-ui-bg-subtle border-r border-ui-border-base">Created</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="px-2 py-1 hover:bg-ui-bg-subtle-hover flex items-center gap-x-1 outline-none text-ui-fg-base cursor-pointer">
                    <span className="truncate max-w-[200px]">
                      {createdFilter || "Select..."}
                    </span>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last 12 months", "Custom"].map((s) => (
                      <DropdownMenu.Item key={s} onClick={() => setCreatedFilter(s)}>
                        <div className="flex items-center gap-x-2">
                          <EllipseMiniSolid className={createdFilter === s ? "visible" : "invisible"} />
                          <span>{s}</span>
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button 
                  className="px-2 py-1 hover:bg-ui-bg-subtle-hover text-ui-fg-muted hover:text-ui-fg-base border-l border-ui-border-base transition-colors"
                  onClick={() => {
                    setActiveFilters(prev => prev.filter(f => f !== "created"));
                    setCreatedFilter(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {activeFilters.includes("updated") && (
              <div className="flex items-center rounded-md border border-ui-border-base shadow-sm text-sm overflow-hidden bg-ui-bg-base">
                <div className="px-2 py-1 font-medium bg-ui-bg-subtle border-r border-ui-border-base">Updated</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="px-2 py-1 hover:bg-ui-bg-subtle-hover flex items-center gap-x-1 outline-none text-ui-fg-base cursor-pointer">
                    <span className="truncate max-w-[200px]">
                      {updatedFilter || "Select..."}
                    </span>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last 12 months", "Custom"].map((s) => (
                      <DropdownMenu.Item key={s} onClick={() => setUpdatedFilter(s)}>
                        <div className="flex items-center gap-x-2">
                          <EllipseMiniSolid className={updatedFilter === s ? "visible" : "invisible"} />
                          <span>{s}</span>
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button 
                  className="px-2 py-1 hover:bg-ui-bg-subtle-hover text-ui-fg-muted hover:text-ui-fg-base border-l border-ui-border-base transition-colors"
                  onClick={() => {
                    setActiveFilters(prev => prev.filter(f => f !== "updated"));
                    setUpdatedFilter(null);
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
                {!activeFilters.includes("created") && (
                  <DropdownMenu.Item onClick={() => setActiveFilters(prev => [...prev, "created"])}>
                    Created
                  </DropdownMenu.Item>
                )}
                {!activeFilters.includes("updated") && (
                  <DropdownMenu.Item onClick={() => setActiveFilters(prev => [...prev, "updated"])}>
                    Updated
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
                  setCreatedFilter(null);
                  setUpdatedFilter(null);
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
                <DropdownMenu.Item onClick={() => setSortBy("title")}>
                  <div className="flex items-center gap-x-2">
                    <EllipseMiniSolid className={sortBy === "title" ? "visible" : "invisible"} />
                    <span>Title</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortBy("created")}>
                  <div className="flex items-center gap-x-2">
                    <EllipseMiniSolid className={sortBy === "created" ? "visible" : "invisible"} />
                    <span>Created</span>
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortBy("updated")}>
                  <div className="flex items-center gap-x-2">
                    <EllipseMiniSolid className={sortBy === "updated" ? "visible" : "invisible"} />
                    <span>Updated</span>
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
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Product</Table.HeaderCell>
                  <Table.HeaderCell>Collection</Table.HeaderCell>
                  <Table.HeaderCell>Variants</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell className="w-10"></Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredProducts.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-x-3">
                        {product.media?.[0] && (
                          <div className="h-8 w-6 overflow-hidden rounded bg-ui-bg-subtle flex-shrink-0">
                            <img
                              src={product.media[0]}
                              alt={product.title?.vi || product.title?.en}
                              className="h-full w-full object-cover"
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
                        {product.collection || "-"}
                      </Text>
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
                          <DropdownMenu.Item>Edit</DropdownMenu.Item>
                          <DropdownMenu.Item className="text-ui-fg-error">
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
          {!isLoading && filteredProducts.length > 0 && (
            <Table.Pagination
              count={filteredProducts.length}
              pageSize={15}
              pageIndex={0}
              pageCount={Math.ceil(filteredProducts.length / 15)}
              canPreviousPage={false}
              canNextPage={filteredProducts.length > 15}
              previousPage={() => {}}
              nextPage={() => {}}
            />
          )}
        </div>
      </Container>
    </div>
  );
}
