import { Link } from "react-router";
import type { StorefrontCategory } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ArrowRight } from "lucide-react";
import { getLocalized } from "../../lib/translation";

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

  const displayCats = categories.slice(0, 6);

  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        {/* Heading */}
        <div className="mb-14 reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            Danh mục sản phẩm
          </p>
          <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
            Chọn theo loại sản phẩm
          </h2>
        </div>

        {/* Grid */}
        <div
          className={`grid gap-4 grid-cols-2 ${
            displayCats.length <= 3
              ? "md:grid-cols-3"
              : "md:grid-cols-3"
          }`}
        >
          {displayCats.map((cat, index) => {
            const name = getLocalized(cat.name, locale);
            const imageUrl = cat.imageUrl
              ? backendAssetUrl(cat.imageUrl)
              : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
            const desc = getDescription(cat.handle, getLocalized(cat.description, locale) || null);

            return (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.handle)}`}
                className="group relative overflow-hidden rounded-xl aspect-[4/5] block reveal active"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Image */}
                <img
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={imageUrl}
                  alt={name}
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[color:color-mix(in_srgb,var(--surface-dark)_80%,transparent)] via-[color:color-mix(in_srgb,var(--surface-dark)_20%,transparent)] to-transparent transition-opacity duration-300 group-hover:from-[color:color-mix(in_srgb,var(--surface-dark)_90%,transparent)]" />

                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  <h3 className="font-heading text-[22px] md:text-[26px] uppercase leading-tight text-white mb-1">
                    {name}
                  </h3>
                  <p className="font-body-md text-body-md text-white/70 text-sm leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-300 mb-3 line-clamp-2">
                    {desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 font-label-md text-label-md text-[13px] uppercase tracking-widest text-brand-support transition-all duration-300 group-hover:gap-3">
                    Xem tất cả
                    <ArrowRight className="text-[16px]" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
