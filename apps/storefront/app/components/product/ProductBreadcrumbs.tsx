import Container from "@/components/container";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getCategoryPath } from "@/lib/storefront-paths";

export type ProductBreadcrumbItem = {
  title: string;
  path?: string | null;
};

export type ProductBreadcrumbParent = ProductBreadcrumbItem;

export function ProductBreadcrumbs({
  title,
  items,
  categoryTitle,
  categoryHandle,
  parentCrumb,
}: {
  title: string;
  items?: ProductBreadcrumbItem[];
  categoryTitle?: string | null;
  categoryHandle?: string | null;
  parentCrumb?: ProductBreadcrumbParent | null;
}) {
  const { t } = useTranslation("common");

  const resolvedItems: ProductBreadcrumbItem[] = items ?? (
    parentCrumb
      ? [parentCrumb]
      : categoryHandle && categoryTitle
        ? [{ title: categoryTitle, path: getCategoryPath(categoryHandle) }]
        : [{ title: t("breadcrumb_collections"), path: "/products" }]
  );

  return (
    <nav
      aria-label={t("breadcrumb_aria")}
      className="border-y border-border-subtle bg-surface-subtle/80"
    >
      <Container className="flex min-h-13 items-center justify-center py-3">
        <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[12px] font-semibold tracking-[0.08em] text-text-muted">
          {resolvedItems.map((item, index) => (
            <li key={index} className="inline-flex items-center gap-x-3">
              {item.path ? (
                <Link className="transition hover:text-brand-strong" to={item.path}>
                  {item.title}
                </Link>
              ) : (
                <span>{item.title}</span>
              )}
              <span aria-hidden="true" className="text-text-muted/80">
                ›
              </span>
            </li>
          ))}
          <li className="max-w-full truncate text-text-base">{title}</li>
        </ol>
      </Container>
    </nav>
  );
}
