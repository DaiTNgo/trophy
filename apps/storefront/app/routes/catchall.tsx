import { data, Link } from "react-router";
import { useTranslation } from "react-i18next";

export async function loader() {
  return data(null, { status: 404 });
}

export default function CatchAll() {
  const { t } = useTranslation("common");

  return (
    <main className="flex min-h-[min(70vh,42rem)] items-center justify-center bg-surface-base px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-heading text-display-lg-mobile font-semibold tracking-[0.08em] text-brand-support sm:text-display-xl">
          404
        </p>
        <h1 className="mt-2 font-heading text-headline-lg font-semibold text-brand-strong sm:text-display-md">
          {t("notFound.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body-lg text-text-muted">
          {t("notFound.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-action-support px-8 py-4 font-label-md text-label-md uppercase tracking-widest text-white transition-colors hover:bg-action-support-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-support focus-visible:ring-offset-2"
          >
            {t("notFound.homeAction")}
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-lg border border-border-strong bg-surface-base px-8 py-4 font-label-md text-label-md uppercase tracking-widest text-brand-strong transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-support focus-visible:ring-offset-2"
          >
            {t("notFound.productsAction")}
          </Link>
        </div>
      </div>
    </main>
  );
}
