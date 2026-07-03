import { Link } from "react-router";

interface ProductCardProps {
  handle?: string;
  series: string;
  title: string;
  price: string;
  imageSrc: string;
  imageAlt: string;
  rating?: number; // 0-5
}

export function ProductCard({ handle = "cup-hop-kim-kl1-premium", series, title, price, imageSrc, imageAlt, rating = 5 }: ProductCardProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="product-card group bg-surface-container-lowest rounded-xl overflow-hidden luxury-shadow transition-all duration-300 reveal active">
      <div className="relative h-[320px] overflow-hidden bg-surface-container-low">
        <Link to={`/product/${handle}`}>
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            data-alt={imageAlt}
            src={imageSrc}
            alt={imageAlt}
          />
        </Link>
        <div className="product-actions absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2 opacity-0 translate-y-4 transition-all duration-300 bg-gradient-to-t from-black/50 to-transparent z-20">
          <button className="w-full bg-white text-on-surface font-label-md text-sm py-2 rounded uppercase hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">shopping_cart</span> Thêm vào giỏ
          </button>
          <button className="w-full bg-primary text-white font-label-md text-sm py-2 rounded uppercase hover:bg-on-primary-container transition-colors">Mua ngay</button>
        </div>
      </div>
      <div className="p-6">
        <p className="text-xs text-primary font-bold uppercase mb-2">{series}</p>
        <Link to={`/product/${handle}`}>
          <h3 className="font-label-md text-on-surface text-lg mb-2 hover:text-primary transition-colors">{title}</h3>
        </Link>
        <div className="flex items-center justify-between">
          <span className="font-bold text-on-surface">{price}</span>
          <div className="flex gap-1 text-primary">
            {Array.from({ length: fullStars }).map((_, i) => (
              <span key={`full-${i}`} className="material-symbols-outlined !text-sm">star</span>
            ))}
            {hasHalfStar && <span className="material-symbols-outlined !text-sm">star_half</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

