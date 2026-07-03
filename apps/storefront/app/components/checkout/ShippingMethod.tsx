export function ShippingMethod() {
  return (
    <section>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-8">Shipping Method</h2>
      <div className="space-y-4">
        <label className="group relative flex items-center justify-between p-6 bg-white border-2 border-surface-variant hover:border-primary transition-all cursor-pointer rounded-lg shadow-sm">
          <input defaultChecked className="hidden peer" name="shipping" type="radio" value="standard" />
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full border-2 border-outline-variant group-hover:border-primary flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary">
              <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
            </div>
            <div>
              <p className="font-body-lg text-body-lg font-semibold text-on-surface">Standard Delivery</p>
              <p className="text-on-surface-variant text-sm">3 - 5 business days</p>
            </div>
          </div>
          <span className="font-headline-md text-primary">Free</span>
        </label>
        
        <label className="group relative flex items-center justify-between p-6 bg-white border-2 border-surface-variant hover:border-primary transition-all cursor-pointer rounded-lg shadow-sm">
          <input className="hidden peer" name="shipping" type="radio" value="express" />
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full border-2 border-outline-variant group-hover:border-primary flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary">
              <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
            </div>
            <div>
              <p className="font-body-lg text-body-lg font-semibold text-on-surface">Express Delivery</p>
              <p className="text-on-surface-variant text-sm">Next day delivery</p>
            </div>
          </div>
          <span className="font-headline-md text-primary">250,000₫</span>
        </label>
      </div>
    </section>
  );
}
