import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/product.$handle";

import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { ProductBreadcrumbs } from "../components/product/ProductBreadcrumbs";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductInfo } from "../components/product/ProductInfo";
import { ProductMobileActionBar } from "../components/product/ProductMobileActionBar";

import { PRODUCTS } from "../data/products";

export function loader({ params }: Route.LoaderArgs) {
  const product = PRODUCTS.find((p) => p.handle === params.handle);
  if (!product) {
    throw new Response("Not Found", { status: 404 });
  }
  return { product };
}

export function meta(args: Route.MetaArgs) {
  // @ts-ignore
  const title = args.data?.product?.title || "Sản Phẩm";
  return [
    { title: `${title} | TROPHY PRESTIGE` },
  ];
}

export default function ProductDetail() {
  const { product } = useLoaderData<typeof loader>();

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
      <Navbar />
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
        <ProductBreadcrumbs title={product.title} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <ProductGallery imageSrc={product.imageSrc} imageAlt={product.imageAlt} />
          <ProductInfo
            title={product.title}
            price={product.price}
            rating={product.rating}
            reviewsCount={product.reviewsCount}
            description={product.description}
            specs={product.specs}
          />
        </div>
        <ProductMobileActionBar price={product.price} />
      </main>
      <Footer />
    </div>
  );
}
