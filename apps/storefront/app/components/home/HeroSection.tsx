import { Link } from "react-router";
import { backendAssetUrl } from "../../lib/api";
import type { StorefrontProductItem } from "../../lib/api";

interface HeroSectionProps {
  product: StorefrontProductItem | null;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export function HeroSection({ product }: HeroSectionProps) {
  const title = product?.title ?? "CÚP HỢP KIM KL1 PREMIUM";
  const subtitle = product?.subtitle ?? product?.categorySummary ?? null;
  const thumbnailUrl = product?.thumbnail
    ? backendAssetUrl(product.thumbnail)
    : "https://lh3.googleusercontent.com/aida-public/AB6AXuB90_lWYrj8CHeTfe5v4IeTsK_jccQ7hfjKlUGyDzAE_2VQyHihcE0RYeeSzTHrJ7NaTWjH5OrEOsqCdW81uy7isGpX0K9vkN3r2KvwIbAouk5-6HuStftZiDZI0G6HaqG8xo5u911qOcj3AcceeX7ZA-VJUiZym64lQql7RwZ-cOqyN4T7ZVzTnUeFVqc_8DUI58IrGI7JxBWtyoidZXuDgp1_mPySh3xlToWIheWaPGeZyxz-EltiKtZPjoTqJemO2xHf8Hlzam4";
  const productLink = product ? `/product/${product.handle}` : "#";

  const titleWords = title.split(' ');
  const midpoint = Math.ceil(titleWords.length / 2);
  const titleLine1 = titleWords.slice(0, midpoint).join(' ');
  const titleLine2 = titleWords.slice(midpoint).join(' ');

  return (
    <header className="relative w-full h-[85vh] flex items-center overflow-hidden bg-surface-container-low">
      <div className="absolute inset-0 z-0 opacity-80">
        <img className="w-full h-full object-cover" alt={title} src={thumbnailUrl} />
      </div>
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent" />
      <div className="relative z-20 px-margin-desktop max-w-container-max mx-auto w-full">
        <div className="max-w-2xl reveal active">
          {product?.customizable && (
            <div className="inline-block bg-primary-container text-on-primary-container px-4 py-1 rounded-full text-label-md font-bold mb-6">CÓ THỂ TÙY CHỈNH</div>
          )}
          {subtitle && (
            <p className="font-label-md text-label-md uppercase tracking-[0.3em] text-primary mb-2">{subtitle}</p>
          )}
          <h1 className="font-display-lg text-display-lg leading-tight mb-4">
            <span className="block text-on-surface">{titleLine1}</span>
            {titleLine2 && <span className="block text-primary">{titleLine2}</span>}
          </h1>
          {product?.priceAmount != null && (
            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-3xl font-bold text-on-surface">
                {product.priceFrom ? 'Từ ' : ''}{formatPrice(product.priceAmount)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-6">
            <Link to={productLink} className="bg-primary text-white font-label-md text-label-md uppercase px-12 py-4 rounded-full tracking-widest hover:bg-primary-container transition-all duration-300 shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined">shopping_bag</span>
              Xem Chi Tiết
            </Link>
            <Link to="/products" className="border-2 border-primary text-primary font-label-md text-label-md uppercase px-10 py-4 rounded-full tracking-widest hover:bg-primary-fixed transition-all duration-300">
              Tất Cả Sản Phẩm
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
