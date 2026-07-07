import { useSearchParams } from "react-router";
import { ProductCard } from "../components/shared/ProductCard";
import { Pagination } from "../components/shared/Pagination";
import { fetchStorefrontCollectionProducts } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { getLocalized } from "../lib/translation";
import { Package } from "lucide-react";
import type { Route } from "./+types/collections.$handle";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const url = new URL(request.url);
  const currentPage = Number(url.searchParams.get("page")) || 1;

  const data = await fetchStorefrontCollectionProducts(params.handle, {
    page: currentPage,
    limit: 12,
  });

  return {
    collectionHandle: params.handle,
    products: data.items,
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    locale,
  };
}

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { collectionHandle, products, currentPage, totalPages, locale } = loaderData;
  const [, setSearchParams] = useSearchParams();

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set("page", page.toString());
      return prev;
    });
  };

  return (
    <div className="bg-background min-h-screen font-body-md text-on-background">
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <div className="mb-12">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
            <a href="/" className="hover:text-primary transition-colors">Trang chủ</a>
            <span>/</span>
            <a href="/products" className="hover:text-primary transition-colors">Sản phẩm</a>
            <span>/</span>
            <span className="text-on-surface capitalize">{collectionHandle.replace(/-/g, " ")}</span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-8 uppercase">
            {collectionHandle.replace(/-/g, " ")}
          </h1>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="text-[64px] text-on-surface-variant/30" />
            <p className="mt-4 text-lg text-on-surface-variant">
              Không có sản phẩm nào trong bộ sưu tập này.
            </p>
            <a
              href="/products"
              className="inline-block mt-6 border-2 border-primary text-primary font-label-md text-label-md uppercase px-10 py-4 rounded-full tracking-widest hover:bg-primary-fixed transition-all duration-300"
            >
              Xem tất cả sản phẩm
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
              {products.map((product, index) => (
                <ProductCard key={index} {...product} title={getLocalized(product.title, locale)} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </div>
  );
}
