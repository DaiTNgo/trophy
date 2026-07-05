import { Award, Info } from "lucide-react";

export function OrderDetails() {
  return (
    <div className="bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/10">
      <div className="space-y-8">
        {/* Header Details */}
        <div className="pb-6 border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-primary mb-4">Chi tiết đơn hàng</h2>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase opacity-60">Mã đơn hàng</p>
              <p className="font-body-lg text-body-lg font-bold">#8259</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase opacity-60">Ngày đặt hàng</p>
              <p className="font-body-lg text-body-lg">24 Tháng 05, 2024</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase opacity-60">Phương thức</p>
              <p className="font-body-lg text-body-lg">Chuyển khoản</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase opacity-60">Tổng thanh toán</p>
              <p className="font-body-lg text-body-lg text-primary font-bold">4.250.000đ</p>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-6">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Sản phẩm</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-surface-container rounded-lg flex-shrink-0 flex items-center justify-center p-2">
              <Award className="text-primary-fixed-dim text-4xl" />
            </div>
            <div className="flex-grow">
              <p className="font-body-md text-body-md font-semibold">Cúp Pha Lê Vinh Danh Cao Cấp</p>
              <p className="font-label-md text-label-md text-on-surface-variant">Số lượng: 01</p>
            </div>
            <div className="text-right">
              <p className="font-body-md text-body-md">4.250.000đ</p>
            </div>
          </div>
        </div>

        {/* Address Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-outline-variant">
          <div>
            <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant mb-3">Địa chỉ giao hàng</h3>
            <div className="space-y-1 font-body-md text-body-md">
              <p className="font-semibold">Trần Anh Quân</p>
              <p className="text-on-surface-variant">123 Đường Lê Lợi, Phường 4</p>
              <p className="text-on-surface-variant">Quận 1, TP. Hồ Chí Minh</p>
              <p className="text-on-surface-variant">090 123 4567</p>
            </div>
          </div>
          <div>
            <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant mb-3">Địa chỉ thanh toán</h3>
            <div className="space-y-1 font-body-md text-body-md">
              <p className="font-semibold">Công ty TNHH Creative</p>
              <p className="text-on-surface-variant">MST: 0312456789</p>
              <p className="text-on-surface-variant">Quận 1, TP. Hồ Chí Minh</p>
            </div>
          </div>
        </div>

        {/* Action Item */}
        <div className="bg-surface-container p-4 rounded-lg flex items-start gap-4">
          <Info className="text-primary" />
          <p className="text-sm text-on-surface-variant">Một email xác nhận chi tiết đã được gửi đến hòm thư của bạn. Vui lòng kiểm tra để theo dõi tiến độ sản xuất.</p>
        </div>
      </div>
    </div>
  );
}
