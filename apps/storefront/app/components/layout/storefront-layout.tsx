import { Outlet, useLoaderData } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  type StorefrontCategory,
  type StorefrontCollection,
} from "../../lib/api";
import { getLocaleFromRequest } from "../../lib/locale";
import { TrustBar } from "../home/TrustBar";

export async function loader({ request }: { request: Request }) {
  const locale = getLocaleFromRequest(request);
  const [categories, collections] = await Promise.all([
    fetchStorefrontCategories(locale).catch(() => [] as StorefrontCategory[]),
    fetchStorefrontCollections(locale).catch(() => [] as StorefrontCollection[]),
  ]);

  return { categories, collections, locale };
}

export default function StorefrontLayout() {
  const { categories, collections, locale } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <TrustBar />
      <Navbar categories={categories} collections={collections} locale={locale} />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
