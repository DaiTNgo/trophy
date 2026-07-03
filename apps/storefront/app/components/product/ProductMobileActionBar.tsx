export function ProductMobileActionBar({ price }: { price: string }) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-4 border-t border-outline-variant flex items-center gap-4 lg:hidden z-50">
      <div className="flex-shrink-0">
        <p className="text-[12px] text-on-surface-variant uppercase">Total</p>
        <p className="font-bold text-primary">{price}</p>
      </div>
      <button className="flex-1 bg-primary text-white py-3 font-label-md uppercase rounded">
        Add to Cart
      </button>
    </div>
  );
}
