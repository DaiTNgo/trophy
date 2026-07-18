import { Link } from "react-router";
import type { StorefrontCategory } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
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
  if (categories.length === 0) return null;
  const featuredCategories = categories.slice(0, 4);

  return (
    <section className="bg-surface-base py-18 md:py-24">
      <Container>
        <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
          {featuredCategories.map((cat, index) => {
            const name = getLocalized(cat.name, locale);
            const imageUrl = cat.imageUrl
              ? backendAssetUrl(cat.imageUrl)
              : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
            const desc = getDescription(cat.handle, getLocalized(cat.description, locale) || null);

            return (
              <div
                key={cat.id}
                className="group reveal active flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Link
                  to={getCategoryPath(cat.handle)}
                  className="group relative flex h-full w-full flex-col"
                >
                  <div className="relative mb-6 flex aspect-square w-full items-center justify-center bg-surface-container-low px-4">
                    <img
                      className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
                      src={imageUrl}
                      alt={name}
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute -left-5 -right-5 bottom-8 z-10 flex flex-col items-center rounded-xl bg-surface-base/90 px-5 pb-6 pt-5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <h3 className="mb-4 text-center font-heading text-[24px] font-bold uppercase leading-tight text-text-base">
                      {name}
                    </h3>
                    <p className="mb-6 line-clamp-3 text-center font-body text-[14px] leading-relaxed text-text-muted">
                      {desc}
                    </p>
                    <div className="mt-auto">
                      <span className="inline-block rounded-sm bg-action-support px-8 py-3 text-[14px] font-bold uppercase tracking-wider text-white transition-colors group-hover:bg-action-support-hover">
                        {locale === "en" ? `Shop ${name}` : `Xem ${name}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-1">
                    <div className="flex h-full flex-col text-center opacity-100 group-hover:opacity-0">
                      <h3 className="mb-4 font-heading text-[24px] font-bold uppercase leading-tight text-text-base">
                        {name}
                      </h3>
                      <p className="mb-6 font-body text-[14px] leading-relaxed text-text-muted">
                        {desc}
                      </p>
                      <div className="mt-auto pb-4 opacity-0">
                        <span className="inline-block rounded-sm bg-action-support px-8 py-3 text-[14px] font-bold uppercase tracking-wider text-white">
                          {locale === "en" ? `Shop ${name}` : `Xem ${name}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
