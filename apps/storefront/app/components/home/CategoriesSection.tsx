import { Link } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StorefrontCategory } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCategoryPath } from "../../lib/storefront-paths";
import { getLocalized } from "../../lib/translation";
import Container from "../container";

// Fallback images for categories that have no image set in the backend
const FALLBACK_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAgQAHozjknMXsuCTTnSblh7acqLFc9ojeTxxob7IBlmX0qt9tGfPPR88W1MN-oM7wGmvXNWbvcEFp8lFXeuxilObjL7GKKEUMDJu4eS6IlBSZT1iQMYN_hSTQbnRK8E0aJQ41BlDFDpLJMYjEoLhBm1EeZYaLe4U68gAIwomcdGJYzqLnANzgpMJKkepY7lK8JyRwQCSAYRCszCCG3eDReWxcRH3bvGaNamkzvYX-ShOEJX7CiZmhQBc4AohWK_uSReLwz81UEOOA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCof9Ae0opSNU99rLeTsqWyS8aLCxkh1u3ZC0gk84FAm-6hSVR3vxxyAxBvlqz-6IRc3HOF7CON7FZA7SUKWrued2KBiZxJR8GQoDrO27UZPEXjGFQJ5yeU_gx6wlW1JCEpu3QyRECXvNSu4R9zf8H93yrHCF8LwtOFhxOK3jNBm6xMa1BUMF7zFHZXtm7wgqIS9WtpYHQXGwIIZYJQ5h3eQkw0qjv7vlkCmMjtuhb88TMYG8RYdiqGWEgE0dQyoyN4GuffoltSSNI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBIhwzhb8Rp0GXr_875RT-XyDhy8KLGVdwRSITj2AteLLm5NOcBqtFc0K_rPrfacTkx0MKSv3tRwWJJrWyDUeURf_PxnZZ8wHIP0tlO9_AIWsHpKsjsXWkfp6XnnBd0sa4VMbUOReJw5ydBXZby9gc8Zg1CCUqyOwYSvAfMyPudNlHePxT8se1LfRdIYdXDkr6N6znHAzCAlTamdKnbTAw6ilSQ21CkYRFv-aCMcAL3e9pYxyho69XvNi7S5zcsnIN1ellfTjv4E1Y",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA2FCfPdrQpja-rjExsQd6KNCCoZNzH36iGPwJeAxKKPWSY3cTmr3yqknJWs5OQp9TGFUFRfllZO986nIdrrrIc6FLfigAjaRSI0ZDysGNn5uw-VmvpAAfQhcZFBp283NNwYtkL8u0ESkyIamEFzYd81MRZn3QIBtIl9arsNepDYwtPr0kIEg_nFgQOV_0qN7ijkpD-TqXtHTrXqBHWr8L1AB7HFwPvY5JMbvFw1vaf6QNEV8HU4ww6hXGMH1CybcknWrJ06CDAEhU",
];

// One-sentence descriptions per category slug — fallback to generic
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "cup-vinh-danh": "Cho lễ trao giải, nội bộ công ty và sự kiện thành tích.",
  "ky-niem-chuong": "Khắc tên, logo và nội dung theo yêu cầu.",
  "huy-chuong": "Dành cho giải đấu thể thao, học sinh xuất sắc và sự kiện đặc biệt.",
  "bang-vinh-danh": "Trưng bày trang trọng tại văn phòng và hội trường.",
  "cup-the-thao": "Thiết kế năng động, phù hợp mọi môn thể thao.",
  "san-pham-tuy-chinh": "Mẫu riêng theo yêu cầu — logo, hình ảnh, nội dung khắc.",
};

function getDescription(handle: string, description: string | null) {
  return description || CATEGORY_DESCRIPTIONS[handle] || "Khám phá dòng sản phẩm đa dạng của chúng tôi.";
}

interface ShopByProductSectionProps {
  categories: StorefrontCategory[];
  locale?: string;
}

export function CategoriesSection({ categories, locale = "vi" }: ShopByProductSectionProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;

    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    setCanScrollLeft(hasOverflow && node.scrollLeft > 1);
    setCanScrollRight(hasOverflow && node.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScrollState)
        : null;

    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [categories.length, updateScrollState]);

  const scrollByDirection = useCallback((direction: "left" | "right") => {
    const node = scrollRef.current;

    if (!node) return;

    const scrollAmount = Math.max(node.clientWidth * 0.85, 280);

    node.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  if (categories.length === 0) return null;

  const hasScrollableControls = canScrollLeft || canScrollRight;

  return (
    <Container className="py-24">
      <div className="relative">
        {hasScrollableControls ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between md:flex">
            <button
              type="button"
              aria-label="Scroll categories left"
              className={`pointer-events-auto -ml-5 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
                canScrollLeft ? "opacity-100 hover:text-brand-strong" : "opacity-0"
              }`}
              disabled={!canScrollLeft}
              onClick={() => scrollByDirection("left")}
            >
              <ChevronLeft className="h-6 w-6 stroke-[1.5]" />
            </button>
            <button
              type="button"
              aria-label="Scroll categories right"
              className={`pointer-events-auto -mr-5 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
                canScrollRight ? "opacity-100 hover:text-brand-strong" : "opacity-0"
              }`}
              disabled={!canScrollRight}
              onClick={() => scrollByDirection("right")}
            >
              <ChevronRight className="h-6 w-6 stroke-[1.5]" />
            </button>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-8 overflow-x-auto scroll-smooth pb-2"
        >
          {categories.map((cat, index) => {
            const name = getLocalized(cat.name, locale);
            const imageUrl = cat.imageUrl
              ? backendAssetUrl(cat.imageUrl)
              : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
            const desc = getDescription(cat.handle, getLocalized(cat.description, locale) || null);

            return (
              <div
                key={cat.id}
                className="group reveal active flex shrink-0 grow-0 basis-[78vw] snap-start flex-col items-center text-center sm:basis-[calc((100%_-_2rem)/2)] lg:basis-[calc((100%_-_6rem)/4)]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Link
                  to={getCategoryPath(cat.handle)}
                  className="block w-full group relative flex flex-col h-full"
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full mb-6 flex items-center justify-center">
                    <img
                      className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                      src={imageUrl}
                      alt={name}
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute -left-5 -right-5 bottom-8  bg-white/75 opacity-0 group-hover:opacity-100 z-10 flex flex-col items-center pt-5 pb-6 px-5 pointer-events-none group-hover:pointer-events-auto rounded-xl">
                    <h3 className="font-heading text-[24px] font-bold uppercase leading-tight text-[#232323] mb-4 text-center">
                      {name}
                    </h3>
                    <p className="font-body text-[#4a4a4a] text-[14px] leading-relaxed mb-6 text-center line-clamp-3">
                      {desc}
                    </p>
                    <div className="mt-auto">
                      <span className="inline-block px-8 py-3 bg-[#288ab6] hover:bg-[#244159] text-white font-bold text-[14px] uppercase tracking-wider rounded-sm transition-colors">
                        Shop {name}
                      </span>
                    </div>
                  </div>

                  {/* Text Area Container (Relative to contain the absolute hover card) */}
                  <div className=" flex-1 mt-4">
                    {/* Fake UI: Luôn giữ kích thước cố định, có chứa button nhưng bị ẩn đi, khi hover thì opacity 0 (không animation theo yêu cầu) */}
                    <div className="text-center flex flex-col h-full opacity-100 group-hover:opacity-0">
                      <h3 className="font-heading text-[24px] font-bold uppercase leading-tight text-[#232323] mb-4">
                        {name}
                      </h3>
                      <p className="font-body text-[#4a4a4a] text-[14px] leading-relaxed mb-6">
                        {desc}
                      </p>
                      <div className="mt-auto pb-4 opacity-0">
                        <span className="inline-block px-8 py-3 bg-[#288ab6] text-white font-bold text-[14px] uppercase tracking-wider rounded-sm">
                          Shop {name}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {hasScrollableControls ? (
          <div className="mt-6 flex items-center justify-center gap-4 md:hidden">
            <button
              type="button"
              aria-label="Scroll categories left"
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
                canScrollLeft ? "opacity-100" : "opacity-40"
              }`}
              disabled={!canScrollLeft}
              onClick={() => scrollByDirection("left")}
            >
              <ChevronLeft className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              aria-label="Scroll categories right"
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
                canScrollRight ? "opacity-100" : "opacity-40"
              }`}
              disabled={!canScrollRight}
              onClick={() => scrollByDirection("right")}
            >
              <ChevronRight className="h-5 w-5 stroke-[1.5]" />
            </button>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
