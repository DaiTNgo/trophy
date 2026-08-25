import Container from "@/components/container";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getCategoryPath } from "@/lib/storefront-paths";

export function ProductBreadcrumbs({
  title,
  categoryTitle,
  categoryHandle,
}: {
  title: string;
  categoryTitle?: string | null;
  categoryHandle?: string | null;
}) {
  const { t } = useTranslation("common");

  return (
    <nav
      aria-label={t("breadcrumb_aria")}
      className="border-y border-border-subtle bg-surface-subtle/80"
    >
      <Container className="flex min-h-13 items-center justify-center py-3">
        <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[12px] font-semibold tracking-[0.08em] text-text-muted">
          <li>
            <Link className="transition hover:text-brand-strong" to="/">
              {t("breadcrumb_home")}
            </Link>
          </li>
          <li aria-hidden="true" className="text-text-muted/80">
            ›
          </li>
          <li>
            {categoryHandle && categoryTitle ? (
              <Link
                className="transition hover:text-brand-strong"
                to={getCategoryPath(categoryHandle)}
              >
                {categoryTitle}
              </Link>
            ) : (
              <Link className="transition hover:text-brand-strong" to="/products">
                {t("breadcrumb_collections")}
              </Link>
            )}
          </li>
          <li aria-hidden="true" className="text-text-muted/80">
            ›
          </li>
          <li className="max-w-full truncate text-text-base">{title}</li>
        </ol>
      </Container>
    </nav>
  );
}
