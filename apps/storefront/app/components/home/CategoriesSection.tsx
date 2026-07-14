import { Link } from "react-router";
import type { StorefrontCategory } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ArrowRight } from "lucide-react";
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

  const displayCats = categories.slice(0, 4);

  return (
    <Container className="py-24">
      {/* Grid */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {displayCats.map((cat, index) => {
          const name = getLocalized(cat.name, locale);
          const imageUrl = cat.imageUrl
            ? backendAssetUrl(cat.imageUrl)
            : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
          const desc = getDescription(cat.handle, getLocalized(cat.description, locale) || null);

          return (
            <div
              key={cat.id}
              className="flex flex-col items-center text-center group reveal active"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Link
                to={`/products?category=${encodeURIComponent(cat.handle)}`}
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

                {/* Text Area */}
                <div className="text-center flex-1 flex flex-col">
                  <h3 className="font-heading text-[20px] md:text-[24px] font-bold uppercase leading-tight text-[#111111] mb-4">
                    {name}
                  </h3>
                  <p className="font-body text-[#444444] text-[15px] leading-relaxed mb-6">
                    {desc}
                  </p>
                  
                  {/* Button Wrapper (takes up space or positioned absolute based on preference, here we make it fade in and slide up) */}
                  <div className="mt-auto opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto pb-4">
                    <span className="inline-block px-8 py-3.5 bg-[#2582a1] hover:bg-[#1d6b87] text-white font-bold text-[14px] uppercase tracking-wider rounded-sm transition-colors">
                      Shop {name}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
