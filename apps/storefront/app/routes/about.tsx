import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getLocale } from "../i18n.server";
import type { Route } from "./+types/about";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  Trophy,
  Gem,
  ArrowRight,
  Building2,
  Pickaxe,
  Award,
  Phone,
  MessageCircle,
  Mail,
  PenLine,
  FileCheck,
  Hammer,
  PackageCheck,
  Handshake,
  PartyPopper,
  Rocket,
} from "lucide-react";
import { ProductMarqueeSection } from "../components/about/product-marquee-section";
import Container from "../components/container";

export async function loader({ context }: Route.LoaderArgs) {
  const locale = getLocale(context);
  return { locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const isEn = loaderData?.locale === "en";
  return [
    {
      title: isEn ? "About Us | Phùng Thị" : "Về Chúng Tôi | Phùng Thị",
    },
    {
      name: "description",
      content: isEn
        ? "Over 600,000 awards delivered. Vietnam's leading manufacturer of crystal trophies, commemorative medals, and honor gifts with 15+ years of experience."
        : "Hơn 600,000 giải thưởng đã trao tay. Xưởng sản xuất cúp pha lê, kỷ niệm chương và quà tặng vinh danh hàng đầu Việt Nam với 15+ năm kinh nghiệm.",
    },
  ];
}

const PRODUCT_IMAGES = [
  "/images/about/product-1.jpg",
  "/images/about/product-2.jpg",
  "/images/about/product-3.jpg",
  "/images/about/product-4.jpg",
  "/images/about/product-5.jpg",
  "/images/about/product-6.jpg",
];

const STEP_ICONS = [PenLine, FileCheck, Hammer, PackageCheck];

const MATERIAL_ASSETS = [
  { icon: Gem, bgImage: "/images/materials/crystal.jpg" },
  { icon: Pickaxe, bgImage: "/images/materials/alloy.jpg" },
  { icon: Award, bgImage: "/images/materials/gold.jpg" },
  { icon: Building2, bgImage: "/images/materials/wood.jpg" },
];

const VALUE_ASSETS = [
  { icon: Gem, bgImage: "/images/materials/handicraft.jpg" },
  { icon: PenLine, bgImage: "/images/materials/creative.jpg" },
  { icon: Handshake, bgImage: "/images/materials/partnership.jpg" },
];

const CLIENT_ASSETS = [
  { icon: Building2, bgImage: "/images/clients/corporate.jpg" },
  { icon: Trophy, bgImage: "/images/clients/sports.jpg" },
  { icon: PartyPopper, bgImage: "/images/clients/education.jpg" },
  { icon: Rocket, bgImage: "/images/clients/startup.jpg" },
];

export default function AboutRoute() {
  useScrollReveal();
  const { t } = useTranslation("about");

  const products = t("products_items", { returnObjects: true }) as {
    name: string; material: string; category: string;
  }[];
  const steps = t("process_steps", { returnObjects: true }) as {
    title: string; body: string;
  }[];
  const materials = t("materials_items", { returnObjects: true }) as {
    name: string; desc: string; use: string;
  }[];
  const values = t("values_items", { returnObjects: true }) as {
    title: string; body: string;
  }[];
  const clients = t("clients_items", { returnObjects: true }) as {
    title: string; body: string;
  }[];

  return (
    <div className="overflow-x-hidden">
      <ProductMarqueeSection />

      {/* ── B. What We Make ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-base pb-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("products_label")}
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              {t("products_title")}
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {t("products_desc")}
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
              {products.map((product, i) => (
                <div
                  key={product.name}
                  className="group relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  <img
                    className="w-full transition-transform duration-500 group-hover:scale-105"
                    src={PRODUCT_IMAGES[i]}
                    alt={product.name}
                    loading="lazy"
                  />
                  <div className="px-3 py-2.5">
                    <p className="text-center text-[13px] font-bold uppercase tracking-wide text-on-surface">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-center text-[12px] font-semibold text-on-surface-variant">
                      {product.material}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/products"
              className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-lg border-2 border-brand-strong px-8 py-3.5 font-label-md text-label-md uppercase tracking-widest text-brand-strong transition-all duration-300 hover:bg-brand-strong hover:text-white"
            >
              {t("products_cta")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── C. How We Make It ───────────────────────────────── */}
      <section className="bg-surface-container-low py-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("process_label")}
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-snug text-on-surface md:text-[44px]">
              {t("process_title")}
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {t("process_desc")}
            </p>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => {
                const StepIcon = STEP_ICONS[i];
                return (
                  <div
                    key={step.title}
                    className="group reveal rounded-xl border border-brand-accent/20 bg-brand-strong/[0.03] luxury-shadow transition-all duration-500 hover:-translate-y-1 hover:border-brand-accent/40 hover:bg-brand-strong/[0.06] hover:luxury-shadow-lg"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex flex-col items-center p-8 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-strong to-brand-support shadow-lg shadow-brand-strong/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <StepIcon className="text-[24px] text-white" />
                      </div>
                      <h3 className="mb-3 font-heading text-[22px] uppercase text-on-surface">
                        {step.title}
                      </h3>
                      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* ── D. Materials ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-container-low py-24">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full border border-brand-support/10" />
        <div className="pointer-events-none absolute -bottom-16 right-[10%] h-32 w-32 rotate-45 border border-brand-accent/10" />
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("materials_label")}
            </p>
            <h2 className="mb-14 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              {t("materials_title")}
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {materials.map((mat, i) => {
                const { icon: MatIcon, bgImage } = MATERIAL_ASSETS[i];
                return (
                  <div
                    key={mat.name}
                    className="group reveal relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:luxury-shadow"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
                    <div className="relative z-10 flex h-[340px] flex-col p-7">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <MatIcon className="text-[22px] text-white" />
                      </div>
                      <h3 className="mb-3 font-heading text-[22px] uppercase text-white">
                        {mat.name}
                      </h3>
                      <p className="flex-1 font-body-md text-body-md leading-relaxed text-white/80">
                        {mat.desc}
                      </p>
                      <p className="h-[3rem] font-label-md text-label-md text-[12px] uppercase tracking-wide text-brand-accent">
                        {mat.use}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* ── E. Core Values ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-surface-base py-24">
        <div className="pointer-events-none absolute -right-24 top-[20%] h-48 w-48 rounded-full border border-brand-accent/8" />
        <div className="pointer-events-none absolute left-[10%] top-[60%] h-6 w-6 rotate-45 bg-brand-strong/10" />
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("values_label")}
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              {t("values_title")}
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {t("values_desc")}
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 reveal">
              {values.map((v, i) => {
                const { icon: ValIcon, bgImage } = VALUE_ASSETS[i];
                return (
                  <div
                    key={v.title}
                    className="group reveal relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:luxury-shadow"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
                    <div className="relative z-10 flex min-h-[300px] flex-col p-7">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <ValIcon className="text-[22px] text-white" />
                      </div>
                      <h3 className="mb-3 font-heading text-[22px] uppercase text-white">
                        {v.title}
                      </h3>
                      <p className="font-body-md text-body-md leading-relaxed text-white/80">
                        {v.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* ── F. Who We Serve ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-base py-24">
        <Container>
          <div className="reveal">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("clients_label")}
            </p>
            <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-on-surface md:text-[44px]">
              {t("clients_title")}
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="mb-14 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {t("clients_desc")}
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {clients.map((client, i) => {
                const { icon: ClientIcon, bgImage } = CLIENT_ASSETS[i];
                return (
                  <div
                    key={client.title}
                    className="group reveal relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:luxury-shadow"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
                    <div className="relative z-10 flex min-h-[280px] flex-col p-7">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <ClientIcon className="text-[22px] text-white" />
                      </div>
                      <h3 className="mb-3 font-heading text-[22px] uppercase text-white">
                        {client.title}
                      </h3>
                      <p className="font-body-md text-body-md leading-relaxed text-white/80">
                        {client.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-16 max-w-2xl text-center reveal">
              <div className="mx-auto mb-6 h-[3px] w-16 bg-brand-accent" />
              <p className="font-heading text-[26px] uppercase leading-tight text-on-surface md:text-[32px]">
                {t("closing_line1")}
                <br />
                <span className="text-brand-accent">
                  {t("closing_line2")}
                </span>
                <br />
                {t("closing_line3")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── G. Final CTA ─────────────────────────────────────── */}
      <section className="bg-surface-dark px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max text-center reveal">
          <h2 className="font-heading text-[36px] uppercase leading-tight text-white md:text-[48px]">
            {t("cta_title_1")}
            <br />
            {t("cta_title_2")}
          </h2>
          <div className="mx-auto mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-action-support px-10 py-5 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              {t("cta_button_products")}
              <ArrowRight className="text-[18px]" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/40 px-10 py-5 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10"
            >
              {t("cta_button_contact")}
            </Link>
          </div>

          <div className="mx-auto mt-16 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-4 font-body-md text-body-md text-white/60">
            <a
              href="tel:0816999296"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <Phone className="size-4" />
              0816 999 296
            </a>
            <a
              href="https://zalo.me/352826287636550047"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <MessageCircle className="size-4" />
              Zalo OA
            </a>
            <a
              href="mailto:Lienhe.phungthi@gmail.com"
              className="flex items-center gap-2 transition-colors hover:text-brand-accent"
            >
              <Mail className="size-4" />
              Lienhe.phungthi@gmail.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
