import {
  Mail,
  MapPin,
  MessageCircle,
  Phone
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import Container from "../container";

export function Footer() {
  const { t } = useTranslation("layout");

  return (
    <footer className="bg-surface-dark py-20">
      <Container>
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-8 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                {t("footer_quick_links")}
              </h4>
              <ul className="space-y-4 font-body-md text-body-md text-white/72">
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/about">
                    {t("footer_about")}
                  </Link>
                </li>
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/products">
                    {t("footer_all_products")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                {t("footer_customer_support")}
              </h4>
              <ul className="space-y-4 font-body-md text-body-md text-white/72">
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/contact">
                    {t("footer_support_contact")}
                  </Link>
                </li>
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/order-lookup">
                    {t("footer_order_lookup")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 flex items-center gap-2 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                {t("footer_workshops")}
              </h4>
              <div className="space-y-6 font-body-md text-body-md text-white/72">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-label-sm text-white">
                    <MapPin className="size-4" />
                    {t("footer_region_north")}
                  </p>
                  <p className="ml-6">{t("footer_address_north")}</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-label-sm text-white">
                    <MapPin className="size-4" />
                    {t("footer_region_south")}
                  </p>
                  <p className="ml-6">{t("footer_address_south")}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-8 flex items-center gap-2 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                {t("footer_contact_info")}
              </h4>
              <div className="space-y-3 font-body-md text-body-md text-white/72">
                <p className="flex items-center gap-1.5 font-label-sm text-white">
                  {t("footer_company_name")}
                </p>
                <p className="flex items-center gap-1.5 italic">
                  {t("footer_tax_code")}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0" />
                  {t("footer_hotline")}
                  <a
                    href="tel:0816999296"
                    className="transition-colors hover:text-brand-accent"
                  >
                    0816 999 296
                  </a>
                </p>
                <p className="flex items-center gap-1.5">
                  <MessageCircle className="size-4 shrink-0" />
                  {t("footer_zalo")}
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="size-4 shrink-0" />
                  {t("footer_email")}
                  <a
                    href="mailto:Lienhe.phungthi@gmail.com"
                    className="transition-colors hover:text-brand-accent"
                  >
                    Lienhe.phungthi@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/12 pt-8 md:flex-row">
            <p className="font-body-md text-body-md text-white/60">
              {t("footer_copyright")}
            </p>
            <div className="flex gap-8 font-label-md text-label-md uppercase tracking-widest text-white/60">
              <a className="transition-colors hover:text-brand-accent" href="#">
                {t("footer_privacy")}
              </a>
              <a className="transition-colors hover:text-brand-accent" href="#">
                {t("footer_terms")}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
