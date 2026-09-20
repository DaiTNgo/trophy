import { useNavigate, useSearchParams } from "react-router";
import { getCategoryPath } from "@/lib/storefront-paths";

export function useCategoryListingNavigation(categoryHandle: string) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectCollection = (collectionHandle: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (collectionHandle) {
      nextSearchParams.set("collection", collectionHandle);
    } else {
      nextSearchParams.delete("collection");
    }
    nextSearchParams.delete("page");
    const qs = nextSearchParams.toString();
    navigate(`${getCategoryPath(categoryHandle)}${qs ? `?${qs}` : ""}`);
  };

  const selectCategory = (nextCategoryHandle: string) => {
    navigate(
      nextCategoryHandle ? getCategoryPath(nextCategoryHandle) : "/products",
    );
  };

  const changePage = (page: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("page", page.toString());
    navigate(`${getCategoryPath(categoryHandle)}?${nextSearchParams}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return {
    selectCollection,
    selectCategory,
    changePage,
  };
}
