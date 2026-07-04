import { Link } from "react-router";
import type { StorefrontCategory } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";

const FALLBACK_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAgQAHozjknMXsuCTTnSblh7acqLFc9ojeTxxob7IBlmX0qt9tGfPPR88W1MN-oM7wGmvXNWbvcEFp8lFXeuxilObjL7GKKEUMDJu4eS6IlBSZT1iQMYN_hSTQbnRK8E0aJQ41BlDFDpLJMYjEoLhBm1EeZYaLe4U68gAIwomcdGJYzqLnANzgpMJKkepY7lK8JyRwQCSAYRCszCCG3eDReWxcRH3bvGaNamkzvYX-ShOEJX7CiZmhQBc4AohWK_uSReLwz81UEOOA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCof9Ae0opSNU99rLeTsqWyS8aLCxkh1u3ZC0gk84FAm-6hSVR3vxxyAxBvlqz-6IRc3HOF7CON7FZA7SUKWrued2KBiZxJR8GQoDrO27UZPEXjGFQJ5yeU_gx6wlW1JCEpu3QyRECXvNSu4R9zf8H93yrHCF8LwtOFhxOK3jNBm6xMa1BUMF7zFHZXtm7wgqIS9WtpYHQXGwIIZYJQ5h3eQkw0qjv7vlkCmMjtuhb88TMYG8RYdiqGWEgE0dQyoyN4GuffoltSSNI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBIhwzhb8Rp0GXr_875RT-XyDhy8KLGVdwRSITj2AteLLm5NOcBqtFc0K_rPrfacTkx0MKSv3tRwWJJrWyDUeURf_PxnZZ8wHIP0tlO9_AIWsHpKsjsXWkfp6XnnBd0sa4VMbUOReJw5ydBXZby9gc8Zg1CCUqyOwYSvAfMyPudNlHePxT8se1LfRdIYdXDkr6N6znHAzCAlTamdKnbTAw6ilSQ21CkYRFv-aCMcAL3e9pYxyho69XvNi7S5zcsnIN1ellfTjv4E1Y",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA2FCfPdrQpja-rjExsQd6KNCCoZNzH36iGPwJeAxKKPWSY3cTmr3yqknJWs5OQp9TGFUFRfllZO986nIdrrrIc6FLfigAjaRSI0ZDysGNn5uw-VmvpAAfQhcZFBp283NNwYtkL8u0ESkyIamEFzYd81MRZn3QIBtIl9arsNepDYwtPr0kIEg_nFgQOV_0qN7ijkpD-TqXtHTrXqBHWr8L1AB7HFwPvY5JMbvFw1vaf6QNEV8HU4ww6hXGMH1CybcknWrJ06CDAEhU",
];

interface CategoriesSectionProps {
  categories: StorefrontCategory[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-32 px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-20 reveal active">
          <h2 className="font-headline-lg text-headline-lg mb-4">DANH MỤC SẢN PHẨM</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Khám phá thế giới vinh danh qua các chất liệu tinh tuyển</p>
        </div>
        <div className={`grid grid-cols-1 gap-gutter ${
          categories.length === 1 ? 'md:grid-cols-1 h-[400px]' :
          categories.length === 2 ? 'md:grid-cols-2 h-[400px]' :
          categories.length === 3 ? 'md:grid-cols-3 h-[400px]' :
          'md:grid-cols-3 h-[600px]'
        }`}>
          {categories.map((cat, index) => {
            const imageUrl = cat.imageUrl ? backendAssetUrl(cat.imageUrl) : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
            const isFirst = index === 0 && categories.length >= 4;
            const isLast = index === categories.length - 1 && categories.length >= 4 && index >= 2;

            return (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className={`group relative overflow-hidden rounded-xl luxury-shadow reveal active block ${
                  isFirst ? 'md:row-span-2' : ''
                }${isLast ? ' md:col-span-2' : ''}`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500 z-10" />
                <img
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={cat.name}
                  src={imageUrl}
                />
                <div className={`absolute z-20 text-white ${
                  isLast
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-8'
                    : 'bottom-8 left-8'
                }`}>
                  <h3 className="font-headline-md text-headline-md mb-2 uppercase">{cat.name}</h3>
                  {cat.description && (
                    <p className={`font-body-md text-body-md mb-4 ${
                      isLast ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                    }`}>{cat.description}</p>
                  )}
                  <span className={`font-label-md text-label-md uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all ${
                    isLast ? 'justify-center' : ''
                  }`}>
                    Xem tất cả <span className="material-symbols-outlined">north_east</span>
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
