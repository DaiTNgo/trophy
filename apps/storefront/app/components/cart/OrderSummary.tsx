import { ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

export function OrderSummary() {
  return (
    <div className="bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-8 flex flex-col space-y-6 sticky top-24 border border-surface-container-high rounded">
      <h2 className="font-headline-md text-headline-md border-b border-outline-variant pb-4">Tóm tắt</h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center text-on-surface-variant font-body-md text-body-md">
          <span>Tổng tiền hàng</span>
          <span>850.000đ</span>
        </div>
        <div className="flex justify-between items-center text-on-surface-variant font-body-md text-body-md">
          <span>Phí vận chuyển</span>
          <span className="italic text-label-md">Tính tại bước tiếp theo</span>
        </div>
      </div>

      <div className="py-6 border-y border-outline-variant flex justify-between items-center">
        <span className="font-bold font-body-lg text-body-lg">Tổng cộng</span>
        <span className="font-headline-md text-headline-md text-primary-container">850.000đ</span>
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Mã giảm giá</label>
        <div className="flex space-x-2">
          <input 
            className="flex-grow bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded p-3 font-body-md text-body-md outline-none" 
            placeholder="Nhập mã của bạn" 
            type="text"
          />
          <button className="px-6 bg-on-background text-on-primary font-bold font-label-md text-label-md uppercase rounded hover:bg-primary transition-colors active:scale-95">Áp dụng</button>
        </div>
      </div>

      {/* CTA Button */}
      <button className="w-full py-5 bg-primary-container text-on-primary-container font-headline-md text-[18px] uppercase tracking-widest rounded shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3">
        <span>Tiến hành thanh toán</span>
        <ArrowRight />
      </button>

      {/* Trust Badges */}
      <div className="pt-4 grid grid-cols-2 gap-4 border-t border-outline-variant">
        <div className="flex flex-col items-center text-center space-y-2">
          <ShieldCheck className="text-primary text-[32px]" />
          <span className="font-label-md text-[11px] text-on-surface-variant uppercase">Thanh toán an toàn</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <RefreshCw className="text-primary text-[32px]" />
          <span className="font-label-md text-[11px] text-on-surface-variant uppercase">Đổi trả 7 ngày</span>
        </div>
      </div>
    </div>
  );
}
