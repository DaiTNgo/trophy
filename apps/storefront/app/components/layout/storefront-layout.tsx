import { Outlet, useLoaderData } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  type StorefrontCategory,
  type StorefrontCollection,
} from "../../lib/api";
import { TrustBar } from "../home/TrustBar";

export async function loader() {
  const [categories, collections] = await Promise.all([
    fetchStorefrontCategories().catch(() => [] as StorefrontCategory[]),
    fetchStorefrontCollections().catch(() => [] as StorefrontCollection[]),
  ]);

  return { categories, collections };
}

export default function StorefrontLayout() {
  const { categories, collections } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen flex-col">
      <TrustBar />
      <Navbar categories={categories} collections={collections} />
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
