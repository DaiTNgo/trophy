export interface CatalogProductCardProps {
  title: string;
  category: string;
  price: string;
  imageSrc: string;
  imageAlt: string;
}

export function CatalogProductCard({ title, category, price, imageSrc, imageAlt }: CatalogProductCardProps) {
  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[3/4] bg-[#F5F5F5] overflow-hidden mb-6 shadow-sm group-hover:shadow-md transition-shadow duration-500">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          alt={imageAlt}
          src={imageSrc}
        />
        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button className="w-full bg-primary text-on-primary py-4 font-label-md text-label-md uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant">
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-label-md text-label-md text-outline uppercase tracking-tighter">{category}</p>
        <h3 className="font-headline-md text-headline-md text-on-background">{title}</h3>
        <p className="font-body-lg text-body-lg text-primary font-bold">{price}</p>
      </div>
    </div>
  );
}
