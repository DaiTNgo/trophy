import { useDeferredValue, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { StatusBadge } from "../components/ui/medusa/status-badge";
import { PageHeader, StatCard, DataPanel, EmptyState } from "../components/ui/medusa";
import { useCatalog } from "../hooks/use-catalog";
import { formatCurrency } from "../lib/utils";

export function ProductsListPage() {
  const { products } = useCatalog();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const flash = (location.state as { flash?: string } | null)?.flash;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [product.id, product.title, product.status, product.category, product.collection, product.handle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [deferredQuery, products]);

  const productStats = useMemo(
    () => ({
      published: products.filter((product) => product.status === "Published").length,
      lowStock: products.filter((product) => product.status === "Low stock").length,
      drafts: products.filter((product) => product.status === "Draft").length,
    }),
    [products],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Products"
        title="Catalog control"
        description="Track publish state, inventory pressure, and pricing across the current assortment."
        actions={
          <Link
            to="/products/new"
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create product
          </Link>
        }
      />

      {flash ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Published" value={String(productStats.published)} hint="Visible in storefront" />
        <StatCard label="Low stock" value={String(productStats.lowStock)} hint="Needs replenishment soon" />
        <StatCard label="Drafts" value={String(productStats.drafts)} hint="Awaiting merchandising review" />
      </div>

      <DataPanel
        title="Product list"
        description="Search by title, handle, collection, category, or publish state."
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:w-72"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Inventory</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to={`/products/${product.id}`} className="block">
                      <p className="font-semibold text-slate-800 transition hover:text-slate-950">{product.title}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{product.handle}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{product.collection || "Unassigned"}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{product.inventory}</td>
                  <td className="px-4 py-4 text-slate-600">{product.updatedAt}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(product.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 ? <EmptyState message="No products matched your current search." /> : null}
        </div>
      </DataPanel>
    </section>
  );
}
