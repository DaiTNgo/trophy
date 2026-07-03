import { ProductCard } from "../shared/ProductCard";

import { PRODUCTS } from "../../data/products";

export function BestSellersSection() {
  return (
    <section className="py-32 px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal active">
          <div>
            <h2 className="font-headline-lg text-headline-lg uppercase mb-4">Sản Phẩm <span className="text-primary">Bán Chạy</span></h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Những mẫu thiết kế được ưa chuộng nhất tại Phùng Thị</p>
          </div>
          <a className="font-label-md text-label-md text-primary uppercase border-b-2 border-primary pb-1 hover:text-on-primary-container transition-colors hidden md:block" href="#">Xem tất cả sản phẩm</a>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {PRODUCTS.map((product: any) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
        
        <div className="mt-12 text-center md:hidden">
          <button className="border-2 border-primary text-primary font-label-md text-label-md uppercase px-10 py-4 rounded-full tracking-widest hover:bg-primary-fixed transition-all duration-300">
            Xem tất cả sản phẩm
          </button>
        </div>
      </div>
    </section>
  );
}
