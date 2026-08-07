import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect } from "react";
import Container from "../container";

const HERO_IMAGES = [
  "/images/home/hero-1.webp",
  "/images/home/hero-2.jpg",
  "/images/home/hero-3.png",
];

export function HeroSection() {
  const { t } = useTranslation("home");
  const slides = t("hero_slides", { returnObjects: true }) as {
    eyebrow: string;
    headlines: string[];
    body: string;
    cta: string;
    cta2: string;
  }[];
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <section className="relative" aria-label="Hero slideshow">
      <Carousel
        opts={{ loop: true, duration: 40 }}
        plugins={[Autoplay({ delay: 6000, stopOnInteraction: false })]}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {slides.map((slide, i) => (
            <CarouselItem key={i} className="pl-0">
              <div className="relative flex h-[75vh] w-full items-center overflow-hidden bg-surface-dark">
                <div className="absolute inset-0 z-0">
                  <img
                    className="h-full w-full object-cover object-center"
                    src={HERO_IMAGES[i]}
                    alt=""
                    fetchPriority={i === 0 ? "high" : "low"}
                  />
                </div>
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--brand-hero)_94%,transparent)] via-[color:color-mix(in_srgb,var(--brand-hero)_60%,transparent)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[color:color-mix(in_srgb,var(--brand-hero)_70%,transparent)] to-transparent" />
                <Container className="py-12 md:py-16">
                  <div className="relative z-20 mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
                    <div className="max-w-2xl">
                      <div className="mb-5">
                        <span className="font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
                          {slide.eyebrow}
                        </span>
                      </div>
                      <h1 className="mb-6 font-heading font-semibold uppercase tracking-wide text-white">
                        {slide.headlines.map((line, j) => (
                          <span
                            key={line}
                            className={`block text-[42px] leading-tight sm:text-[52px] md:text-[60px] lg:text-[64px] ${j === slide.headlines.length - 1 ? "text-brand-accent" : ""}`}
                          >
                            {line}
                          </span>
                        ))}
                      </h1>
                      <p className="mb-8 max-w-md font-body-lg text-body-lg leading-relaxed text-white/80">
                        {slide.body}
                      </p>
                      <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
                        <Link
                          to="/products"
                          className="rounded-lg border-2 border-transparent bg-action-support px-5 py-3 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover active:translate-y-px md:px-8 md:py-4"
                        >
                          {slide.cta}
                        </Link>
                        <Link
                          to="/contact"
                          className="rounded-lg border-2 border-white/60 px-5 py-3 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10 active:translate-y-px md:px-8 md:py-4"
                        >
                          {slide.cta2}
                        </Link>
                      </div>
                    </div>
                  </div>
                </Container>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 bg-brand-accent"
                  : "w-2 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={t("hero_slide_aria_label", { slide: i + 1 })}
            />
          ))}
        </div>

        <CarouselPrevious
          variant="ghost"
          aria-label={t("carousel_previous")}
          className="absolute left-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/30 md:inline-flex"
          classNameIfDisabled="hidden"
        />
        <CarouselNext
          variant="ghost"
          aria-label={t("carousel_next")}
          className="absolute right-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/30 md:inline-flex"
          classNameIfDisabled="hidden"
        />
      </Carousel>
    </section>
  );
}
