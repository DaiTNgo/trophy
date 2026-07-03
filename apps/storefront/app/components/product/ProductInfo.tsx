export function ProductInfo({
  title,
  price,
  rating,
  reviewsCount,
  description,
  specs,
}: {
  title: string;
  price: string;
  rating: number;
  reviewsCount: number;
  description: string;
  specs: any;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="lg:col-span-5 flex flex-col gap-10">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase mb-2">
          {title}
        </h1>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex text-primary">
            {Array.from({ length: fullStars }).map((_, i) => (
              <span key={`full-${i}`} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            ))}
            {hasHalfStar && (
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                star_half
              </span>
            )}
          </div>
          <span className="text-on-surface-variant font-label-md">({reviewsCount} Reviews)</span>
        </div>
        <div className="text-primary font-headline-md text-headline-md tracking-tight">
          {price}
        </div>
      </div>
      <div className="h-px bg-outline-variant w-full"></div>
      {/* Selection Blocks */}
      <div className="space-y-8">
        {/* Size Variant */}
        <div className="space-y-4">
          <label className="font-label-md text-on-surface uppercase">Size</label>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-2 border-2 border-primary bg-primary text-white font-label-md transition-all">
              SMALL
            </button>
            <button className="px-6 py-2 border-2 border-outline hover:border-primary font-label-md transition-all">
              MEDIUM
            </button>
            <button className="px-6 py-2 border-2 border-outline hover:border-primary font-label-md transition-all">
              LARGE
            </button>
          </div>
        </div>
        {/* Material Variant */}
        <div className="space-y-4">
          <label className="font-label-md text-on-surface uppercase">Material</label>
          <div className="flex flex-wrap gap-4">
            <button className="group flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C0C0C0] to-[#E8E8E8] border border-outline-variant"></span>
              <span className="font-label-md text-on-surface-variant group-hover:text-primary transition-colors uppercase">
                Silver
              </span>
            </button>
            <button className="group flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F9E29C] border-2 border-primary"></span>
              <span className="font-label-md text-primary transition-colors uppercase">Gold</span>
            </button>
          </div>
        </div>
        {/* Customization Section */}
        <div className="space-y-4 p-6 bg-surface-container-low rounded-lg">
          <h3 className="font-headline-md text-[20px] uppercase text-on-surface tracking-wide flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_note</span>
            Customization
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="font-label-md text-on-surface-variant uppercase">
                Engraving Text
              </label>
              <textarea
                className="w-full bg-white border-none focus:ring-0 focus:border-b-2 focus:border-primary rounded-none transition-all placeholder:text-surface-variant font-body-md"
                placeholder="Enter the name, achievement, or date to be engraved..."
                rows={3}
              ></textarea>
              <p className="text-[12px] text-on-surface-variant">Recommended: Max 50 characters</p>
            </div>
            <div className="space-y-2">
              <label className="font-label-md text-on-surface-variant uppercase">
                Logo Upload
              </label>
              <div className="relative group">
                <input className="hidden" id="logo-upload" type="file" />
                <label
                  className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant py-8 px-4 cursor-pointer hover:border-primary transition-colors bg-white"
                  htmlFor="logo-upload"
                >
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">
                    upload_file
                  </span>
                  <span className="font-label-md text-on-surface-variant">
                    Click to upload brand logo (.PNG, .SVG)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-col gap-4">
        <button className="w-full bg-primary text-white py-5 font-label-md tracking-[2px] uppercase shadow-md hover:bg-surface-tint transition-all active:scale-[0.98] flex items-center justify-center gap-3">
          <span className="material-symbols-outlined">shopping_bag</span>
          Add to Cart
        </button>
        <button className="w-full border-2 border-primary text-primary py-5 font-label-md tracking-[2px] uppercase hover:bg-primary hover:text-white transition-all active:scale-[0.98]">
          Quick Buy
        </button>
      </div>
      {/* Trust Badges */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">workspace_premium</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Handcrafted</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Premium materials only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Fast Shipping</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Global express delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">verified_user</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Safe Payment</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Secure encryption</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">history_edu</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Legacy Brand</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Since 1988</p>
          </div>
        </div>
      </div>
      {/* Collapsible Details */}
      <div className="divide-y divide-outline-variant">
        <details className="group py-6" open={true}>
          <summary className="flex justify-between items-center cursor-pointer list-none font-label-md uppercase text-on-surface">
            Product Description
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="mt-4 text-on-surface-variant font-body-md leading-relaxed">
            {description}
          </div>
        </details>
        <details className="group py-6">
          <summary className="flex justify-between items-center cursor-pointer list-none font-label-md uppercase text-on-surface">
            Specifications
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-y-3 text-[14px]">
            <span className="text-on-surface-variant">Weight:</span>{" "}
            <span className="text-on-surface font-semibold">{specs?.weight}</span>
            <span className="text-on-surface-variant">Height:</span>{" "}
            <span className="text-on-surface font-semibold">{specs?.height}</span>
            <span className="text-on-surface-variant">Base Material:</span>{" "}
            <span className="text-on-surface font-semibold">{specs?.baseMaterial}</span>
            <span className="text-on-surface-variant">Engraving:</span>{" "}
            <span className="text-on-surface font-semibold">{specs?.engraving}</span>
          </div>
        </details>
      </div>
    </div>
  );
}
