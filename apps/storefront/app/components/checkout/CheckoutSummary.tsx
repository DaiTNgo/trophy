export function CheckoutSummary() {
  return (
    <div className="bg-white p-8 md:p-10 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-xl sticky top-28">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-8 border-b border-surface-variant pb-6">Order Summary</h3>
      
      <div className="space-y-6 mb-10">
        <div className="flex gap-6 items-center">
          <div className="w-24 h-24 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
            <img 
              alt="Bảng Vinh Danh GĐ 17"
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiLyV0agoefe-IUNjFyDmcGqr9OAufjjaIpN24cCM6INDvEdKL9-tsvgE63wo_Bec2Mxq3umcvbX--7cTOxK9N1HTm_555DSI0mterEx603dh85fTR8sCA3n_aUsjBhtDUz5ijWd0kRAQinYMN6wdFdYE5SdsJzZ5LHW2sUk9cAb1FilLpnPJGRLQx0D6_GRC_9Sb_x0Fekg4xUR53-gYRdshK5kCFV2VAwlqv1A3AZKUFkPoBX9BX"
            />
          </div>
          <div className="flex-grow">
            <h4 className="font-body-lg text-body-lg font-bold text-on-surface mb-1">Bảng Vinh Danh GĐ 17</h4>
            <p className="text-on-surface-variant text-sm mb-2">Material: Premium Crystal</p>
            <p className="font-label-md text-label-md text-primary">1,250,000₫</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-surface-variant">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-body-md">Subtotal</span>
          <span className="text-on-surface font-semibold">1,250,000₫</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-body-md">Shipping</span>
          <span className="text-on-surface font-semibold">0₫</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t-2 border-primary border-dotted mt-4">
          <span className="font-headline-md text-on-surface text-2xl">Total</span>
          <span className="font-headline-md text-primary text-3xl">1,250,000₫</span>
        </div>
      </div>

      <button className="w-full mt-10 bg-primary hover:bg-surface-tint text-white py-6 font-label-md text-label-md uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]">
        Place Order
      </button>

      <div className="mt-8 flex items-center justify-center gap-4 text-on-surface-variant opacity-60">
        <span className="material-symbols-outlined text-sm">verified_user</span>
        <span className="text-xs uppercase tracking-widest font-semibold">Secure Checkout Guaranteed</span>
      </div>
    </div>
  );
}
