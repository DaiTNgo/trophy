import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button, Container, IconButton, StatusBadge, Table, Text, toast } from "@medusajs/ui";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import {
  fetchTrashedProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  type TrashedProduct,
} from "../lib/products-client";

export function ProductsTrashPage() {
  const [products, setProducts] = useState<TrashedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setProducts(await fetchTrashedProducts());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load product trash.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function restore(product: TrashedProduct) {
    setPendingId(product.id);
    setError(null);
    try {
      await restoreProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      toast.success("Product restored as draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore product.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete(product: TrashedProduct) {
    const title = product.title.vi || product.title.en || "this product";
    if (!window.confirm(`Permanently delete ${title}? This cannot be undone.`)) return;

    setPendingId(product.id);
    setError(null);
    try {
      await permanentlyDeleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      toast.success("Product permanently deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to permanently delete product.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Container className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-ui-border px-6 py-4">
        <div className="flex items-center gap-x-3">
          <IconButton asChild variant="transparent" size="small">
            <Link to="/products" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </IconButton>
          <Text size="small" className="h1-core font-sans font-medium uppercase tracking-wider">Product trash</Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/products">Products</Link>
        </Button>
      </div>

      {error ? <Text size="small" className="px-6 py-4 text-ui-fg-error">{error}</Text> : null}

      {isLoading ? (
        <Text size="small" className="block px-6 py-8 text-center text-ui-fg-muted">Loading product trash...</Text>
      ) : products.length === 0 ? (
        <Text size="small" className="block px-6 py-8 text-center text-ui-fg-muted">No deleted products.</Text>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Status before deletion</Table.HeaderCell>
                <Table.HeaderCell>Deleted</Table.HeaderCell>
                <Table.HeaderCell className="w-32" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <Text size="small" weight="plus">{product.title.vi || product.title.en}</Text>
                      <Text size="small" className="text-ui-fg-subtle">{product.handle}</Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell><StatusBadge color={product.status === "published" ? "green" : "grey"}>{product.status}</StatusBadge></Table.Cell>
                  <Table.Cell><Text size="small" className="text-ui-fg-subtle">{new Date(product.deletedAt).toLocaleString()}</Text></Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-x-1">
                      <IconButton variant="transparent" size="small" disabled={pendingId === product.id} onClick={() => void restore(product)} aria-label={`Restore ${product.title.vi || product.title.en}`}>
                        <RotateCcw className="h-4 w-4" />
                      </IconButton>
                      <IconButton variant="transparent" size="small" disabled={pendingId === product.id} onClick={() => void permanentlyDelete(product)} aria-label={`Permanently delete ${product.title.vi || product.title.en}`}>
                        <Trash2 className="h-4 w-4 text-ui-fg-error" />
                      </IconButton>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Container>
  );
}
