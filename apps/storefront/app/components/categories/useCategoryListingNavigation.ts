import { useNavigate, useSearchParams } from "react-router";
import { getCategoryPath } from "@/lib/storefront-paths";

export function useCategoryListingNavigation(categoryHandle: string) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectCategory = (nextCategoryHandle: string) => {
    navigate(
      nextCategoryHandle ? getCategoryPath(nextCategoryHandle) : "/products",
    );
  };

  const changePage = (page: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("page", page.toString());
    navigate(`${getCategoryPath(categoryHandle)}?${nextSearchParams}`);
  };

  return {
    selectCategory,
    changePage,
  };
}
