import { useDeferredValue, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Table,
  Text,
} from "@medusajs/ui";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import {
  fetchProducts,
  mapApiProductToCatalogProduct,
} from "../lib/products-client";
import type { CatalogProduct } from "../types";
import { formatCurrency } from "../lib/utils";

function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "Published":
      return "green";
    case "Draft":
      return "grey";
    default:
      return "grey";
  }
}

export function ProductsListPage() {
  const location = useLocation();
  const [query, setQuery] = useState("");
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
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      [
        product.id,
        product.title,
        product.status,
        product.category,
        product.collection,
        product.handle,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery, products]);

  const productStats = useMemo(
    () => ({
      published: products.filter((product) => product.status === "Published")
        .length,
      lowInventory: products.filter(
        (product) =>
          product.status === "Published" &&
          product.inventory > 0 &&
          product.inventory < 10,
      ).length,
      drafts: products.filter((product) => product.status === "Draft").length,
    }),
    [products],
  );

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
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
      </Container>

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

      <div className="grid gap-4 md:grid-cols-3">
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Published
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            {productStats.published}
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            Visible in storefront
          </Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Low inventory
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            {productStats.lowInventory}
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            Needs replenishment soon
          </Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Drafts
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            {productStats.drafts}
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            Awaiting merchandising review
          </Text>
        </Container>
      </div>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">Product list</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Search by title, handle, collection, category, or publish state.
            </Text>
          </div>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="w-full sm:w-72"
          />
        </div>
        <div className="mt-3">
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
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Inventory</Table.HeaderCell>
                  <Table.HeaderCell>Updated</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    Price
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredProducts.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      <Link
                        to={`/products/${product.id}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                      >
                        {product.title}
                      </Link>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {product.handle}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {product.collection || "Unassigned"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={getBadgeColor(product.status)}
                        size="xsmall"
                        rounded="full"
                      >
                        {product.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {product.inventory}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {product.updatedAt}
                      </Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text
                        size="small"
                        className="text-ui-fg-base font-medium"
                      >
                        {formatCurrency(product.price)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>
    </div>
  );
}
