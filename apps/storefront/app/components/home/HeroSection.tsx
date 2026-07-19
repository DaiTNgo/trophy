import { Link } from "react-router";
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

const HERO_SLIDES = [
  {
    image: "/images/home/hero-1.webp",
    eyebrow: "Phùng Thị",
    headline: ["VINH DANH", "XỨNG TẦM", "THÀNH TỰU"],
    accentIndex: 2,
    body: "Cúp, kỷ niệm chương và giải thưởng tùy chỉnh cho doanh nghiệp, giải đấu và sự kiện.",
    cta: { label: "Khám phá sản phẩm", to: "/products" },
    cta2: { label: "Liên hệ tư vấn", to: "/contact" },
  },
  {
    image: "/images/home/hero-2.jpg",
    eyebrow: "Phùng Thị",
    headline: ["HƠN 600,000", "GIẢI THƯỞNG", "ĐÃ TRAO TAY"],
    accentIndex: 2,
    body: "15+ năm kinh nghiệm — 2 xưởng sản xuất tại Hà Nội và TP. HCM. Sản phẩm đã góp mặt tại hàng nghìn sự kiện trên khắp cả nước.",
    cta: { label: "Khám phá sản phẩm", to: "/products" },
    cta2: { label: "Liên hệ tư vấn", to: "/contact" },
  },
  {
    image: "/images/home/hero-3.png",
    eyebrow: "Phùng Thị",
    headline: ["THIẾT KẾ", "THEO YÊU CẦU", "CÁ NHÂN HÓA"],
    accentIndex: 2,
    body: "Từ ý tưởng đến sản phẩm hoàn thiện. Thiết kế riêng theo logo, thông điệp và phong cách của bạn.",
    cta: { label: "Khám phá sản phẩm", to: "/products" },
    cta2: { label: "Liên hệ tư vấn", to: "/contact" },
  },
];

export function HeroSection() {
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
          {HERO_SLIDES.map((slide, i) => (
            <CarouselItem key={i} className="pl-0">
              <div className="relative flex h-[75vh] w-full items-center overflow-hidden bg-surface-dark">
                <div className="absolute inset-0 z-0">
                  <img
                    className="h-full w-full object-cover object-center"
                    src={slide.image}
                    alt=""
                    fetchPriority={i === 0 ? "high" : "low"}
                  />
                </div>
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--brand-hero)_94%,transparent)] via-[color:color-mix(in_srgb,var(--brand-hero)_60%,transparent)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[color:color-mix(in_srgb,var(--brand-hero)_70%,transparent)] to-transparent" />
                <Container className="py-24">
                  <div className="relative z-20 mx-auto w-full max-w-container-max px-margin-mobile py-24 md:px-margin-desktop">
                    <div className="max-w-xl">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="h-[3px] w-16 bg-brand-accent" />
                        <span className="font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
                          {slide.eyebrow}
                        </span>
                      </div>
                      <h1 className="mb-6 font-heading uppercase leading-none tracking-wide text-white">
                        {slide.headline.map((line, j) => (
                          <span
                            key={line}
                            className={`block text-[56px] leading-[1.15] md:text-[72px] ${j === slide.accentIndex ? "text-brand-accent" : ""}`}
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
                          to={slide.cta.to}
                          className="rounded-lg bg-action-support px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
                        >
                          {slide.cta.label}
                        </Link>
                        <Link
                          to={slide.cta2.to}
                          className="rounded-lg border-2 border-white/60 px-8 py-4 text-center font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:border-brand-accent hover:bg-white/10"
                        >
                          {slide.cta2.label}
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
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 bg-brand-accent"
                  : "w-2 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <CarouselPrevious
          variant="ghost"
          className="absolute left-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/30 md:inline-flex"
          classNameIfDisabled="hidden"
        />
        <CarouselNext
          variant="ghost"
          className="absolute right-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/30 md:inline-flex"
          classNameIfDisabled="hidden"
        />
      </Carousel>
    </section>
  );
}
