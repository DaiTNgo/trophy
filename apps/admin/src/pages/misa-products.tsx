import { useEffect, useState } from "react";
import { Button, Container, Heading, Input, Table, Text } from "@medusajs/ui";
import { Copy, RefreshCw, Search } from "lucide-react";
import { fetchMisaProducts, type MisaProduct } from "../lib/products-client";

export function MisaProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<MisaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setProducts(await fetchMisaProducts({ q: query }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load MISA products");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied((current) => current === code ? null : current), 1500);
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Heading level="h1">MISA Products</Heading>
            <Text size="small" className="text-ui-fg-subtle">Lookup products managed by MISA.</Text>
          </div>
          <Button variant="secondary" size="small" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Container>
      <Container className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ui-border px-6 py-4">
          <Search className="h-4 w-4 text-ui-fg-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product code or name" onKeyDown={(event) => { if (event.key === "Enter") void load(); }} />
          <Button variant="secondary" size="small" onClick={() => void load()}>Search</Button>
        </div>
        {error ? <Text className="px-6 py-4 text-ui-fg-error">{error}</Text> : null}
        <Table>
          <Table.Header>
            <Table.Row><Table.HeaderCell>Product code</Table.HeaderCell><Table.HeaderCell>Name</Table.HeaderCell><Table.HeaderCell>Category</Table.HeaderCell><Table.HeaderCell>Unit</Table.HeaderCell><Table.HeaderCell>Status</Table.HeaderCell><Table.HeaderCell /></Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? <Table.Row><Table.Cell>Loading...</Table.Cell></Table.Row> : null}
            {!isLoading && products.length === 0 ? <Table.Row><Table.Cell>No MISA products found.</Table.Cell></Table.Row> : null}
            {products.map((product) => (
              <Table.Row key={`${product.id ?? "no-id"}-${product.product_code}`}>
                <Table.Cell><Text weight="plus">{product.product_code}</Text></Table.Cell>
                <Table.Cell>{product.product_name}</Table.Cell>
                <Table.Cell>{product.product_category ?? "-"}</Table.Cell>
                <Table.Cell>{product.usage_unit ?? "-"}</Table.Cell>
                <Table.Cell>{product.inactive ? "Inactive" : "Active"}</Table.Cell>
                <Table.Cell className="text-right"><Button variant="transparent" size="small" onClick={() => void copyCode(product.product_code)}><Copy className="h-4 w-4" />{copied === product.product_code ? "Copied" : "Copy code"}</Button></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  );
}
