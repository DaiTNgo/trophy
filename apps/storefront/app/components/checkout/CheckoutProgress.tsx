import { Check } from "lucide-react";

export function CheckoutProgress() {
  return (
    <div className="max-w-3xl mx-auto mb-16">
      <div className="flex items-center justify-between relative">
        <div className="flex flex-col items-center z-10">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white mb-2">
            <Check fill="currentColor" />
          </div>
          <span className="font-label-md text-label-md uppercase tracking-tighter text-on-surface-variant">Cart</span>
        </div>
        
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-surface-variant">
          <div className="w-1/2 h-full bg-primary"></div>
        </div>
        
        <div className="flex flex-col items-center z-10">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-primary bg-surface text-primary mb-2 font-bold">
            2
          </div>
          <span className="font-label-md text-label-md uppercase tracking-tighter text-primary">Checkout</span>
        </div>
        
        <div className="flex flex-col items-center z-10">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-variant text-on-surface-variant mb-2">
            3
          </div>
          <span className="font-label-md text-label-md uppercase tracking-tighter text-on-surface-variant">Complete</span>
        </div>
      </div>
    </div>
  );
}
