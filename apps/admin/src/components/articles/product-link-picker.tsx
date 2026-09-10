import { useEffect, useState } from "react";
import { Button, FocusModal, Heading, Input, Text } from "@medusajs/ui";
import { Check } from "lucide-react";
import { fetchProducts } from "../../lib/products-client";
import { cn } from "../../lib/utils";

type PickableProduct = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
};

export function ProductLinkPicker({
  open,
  onOpenChange,
  selectedIds,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onSave: (ids: number[]) => void;
}) {
  const [products, setProducts] = useState<PickableProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<number[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setDraft(selectedIds);
      setQuery("");
      setError(null);
      setLoading(true);
      fetchProducts()
        .then((items) =>
          setProducts(
            items.map((p) => ({
              id: p.id,
              title: typeof p.title === "string" ? p.title : (p.title?.vi ?? p.title?.en ?? `Product ${p.id}`),
              thumbnailUrl: p.media?.[0]?.contentUrl ?? null,
            })),
          ),
        )
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load products"))
        .finally(() => setLoading(false));
    }
  }, [open, selectedIds]);

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id: number) => {
    setDraft((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Link products</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Select products to feature inside this article.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 px-6 py-6">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            size="small"
          />
          {error ? (
            <Text size="small" className="text-ui-fg-error">{error}</Text>
          ) : null}
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <Text size="small" className="text-ui-fg-muted py-4 text-center">
                Loading products...
              </Text>
            ) : filtered.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted py-4 text-center">
                No products found.
              </Text>
            ) : (
              filtered.map((p) => {
                const selected = draft.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex items-center gap-x-3 rounded-md border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-ui-border-interactive bg-ui-bg-subtle"
                        : "border-ui-border-base hover:bg-ui-bg-subtle-hover",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        selected ? "bg-ui-bg-interactive border-transparent" : "border-ui-border-strong",
                      )}
                    >
                      {selected ? <Check className="h-3.5 w-3.5 text-ui-fg-on-color" /> : null}
                    </span>
                    {p.thumbnailUrl ? (
                      <span className="h-8 w-8 overflow-hidden rounded bg-ui-bg-subtle flex-shrink-0">
                        <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      </span>
                    ) : null}
                    <span className="text-ui-fg-base text-sm font-medium">{p.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-between w-full">
            <Text size="small" className="text-ui-fg-muted">
              {draft.length} selected
            </Text>
            <div className="flex items-center gap-2">
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
              <Button onClick={() => { onSave(draft); onOpenChange(false); }}>
                Save
              </Button>
            </div>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}
