import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Mail, MapPin, Phone, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLocale } from "../i18n.server";
import type { Route } from "./+types/contact";
import Container from "../components/container";

export async function loader({ context }: Route.LoaderArgs) {
  const locale = getLocale(context);
  return { locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const isEn = loaderData?.locale === "en";
  return [
    { title: isEn ? "Contact Us | Phùng Thị" : "Liên Hệ | Phùng Thị" },
    {
      name: "description",
      content: isEn
        ? "Contact Phùng Thị for consultation and quotes on custom trophies, commemorative medals and gifts."
        : "Liên hệ với Phùng Thị để được tư vấn và báo giá các sản phẩm cúp, kỷ niệm chương và quà tặng.",
    },
  ];
}

export default function ContactRoute() {
  const { t } = useTranslation("contact");
  const [searchParams] = useSearchParams();
  const product = searchParams.get("product");
  const variant = searchParams.get("variant");
  const sku = searchParams.get("sku");

  return (
    <div className="bg-surface-base py-16 md:py-24">
      <Container>
        <div className="mb-3 flex items-center gap-3">
          <div className="h-[3px] w-10 bg-brand-accent" />
          <span className="font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            {t("label")}
          </span>
        </div>

        <h1 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
          {t("heading")}
        </h1>

        <div className="mb-6 h-[3px] w-16 bg-brand-support" />

        <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
          {t("description")}
        </p>

        <div className="mb-16 grid gap-4 sm:grid-cols-2">
          {([
            { key: "hotline", href: "tel:0816999296" },
            { key: "hotline2", href: "tel:0966100050" },
            { key: "email", href: "mailto:Lienhe.phungthi@gmail.com" },
          ] as const).map(({ key, href }) => {
            const Icon = key === "email" ? Mail : Phone;
            const isExternal = href.startsWith("http");
            return (
              <a
                key={key}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="group rounded-xl border border-blue-200 bg-blue-50 p-5 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-100 p-2.5 text-blue-500">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                      {t(`${key}_label`)}
                    </p>
                    <p className="mt-1 truncate font-semibold text-on-surface">
                      {t(`${key}_value`)}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {t(`${key}_desc`)}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {(product || variant || sku) && (
          <div className="mb-10 rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-accent">
              {t("product_info_badge")}
            </p>
            {product ? (
              <p className="mt-2 font-semibold text-on-surface">{product}</p>
            ) : null}
            {variant ? (
              <p className="mt-1 text-sm text-on-surface-variant">{t("variant_label")}: {variant}</p>
            ) : null}
            {sku ? (
              <p className="mt-1 text-sm text-on-surface-variant">{t("sku_label")}: {sku}</p>
            ) : null}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="font-heading text-2xl uppercase text-on-surface">
              {t("form_heading")}
            </h2>
            <div className="mt-2 h-[3px] w-10 bg-brand-support" />

            <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="name">
                  {t("form_name_label")} <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-brand-support focus:outline-none focus:ring-2 focus:ring-brand-support/20"
                  placeholder={t("form_name_placeholder")}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="phone">
                    {t("form_phone_label")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-brand-support focus:outline-none focus:ring-2 focus:ring-brand-support/20"
                    placeholder={t("form_phone_placeholder")}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="email">
                    {t("form_email_label")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-brand-support focus:outline-none focus:ring-2 focus:ring-brand-support/20"
                    placeholder={t("form_email_placeholder")}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="message">
                  {t("form_message_label")} <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-brand-support focus:outline-none focus:ring-2 focus:ring-brand-support/20 resize-y"
                  placeholder={t("form_message_placeholder")}
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-strong px-6 py-3 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-200 hover:bg-brand-strong/90"
              >
                {t("form_submit")}
                <Send className="size-4" />
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="flex items-center gap-2 font-heading text-lg uppercase text-on-surface">
                <MapPin className="size-4 text-brand-accent" />
                {t("workshop_heading")}
              </h3>
              <div className="mt-4 space-y-4">
                {[
                  { regionKey: "region_north", addressKey: "address_north" },
                  { regionKey: "region_south", addressKey: "address_south" },
                ].map(({ regionKey, addressKey }) => (
                  <div key={regionKey}>
                    <p className="text-sm font-medium text-on-surface">{t(regionKey)}</p>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{t(addressKey)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/products"
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-on-surface transition-colors hover:border-brand-strong hover:text-brand-strong"
            >
              <ArrowLeft className="size-4" />
              {t("back_link")}
            </Link>
          </aside>
        </div>
      </Container>
    </div>
  );
}
