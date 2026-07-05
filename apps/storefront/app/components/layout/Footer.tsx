import { Link } from "react-router";
import { Building2, Factory, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-surface-container-low text-on-surface py-20 px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8">
              Liên Kết Nhanh
            </h4>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors" href="#">Về Phùng Thị</a>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" to="/products">Tất cả sản phẩm</Link>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Dự án tiêu biểu</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Tin tức &amp; Sự kiện</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8">
              Hỗ Trợ Khách Hàng
            </h4>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors" href="#">Chính sách bảo hành</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Hướng dẫn đặt hàng</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Vận chuyển &amp; Thanh toán</a>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" to="/order-lookup">Tra cứu đơn hàng</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8 flex items-center gap-2">
              <Factory className="size-5" /> Xưởng Sản Xuất
            </h4>
            <div className="space-y-6 font-body-md text-body-md text-on-surface-variant">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface mb-1 flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" /> Miền Bắc
                </p>
                <p className="ml-6">Thôn 2, xã Hòa Lạc, TP. Hà Nội</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface mb-1 flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" /> Miền Nam
                </p>
                <p className="ml-6">1264/47 Lê Đức Thọ, Phường 13, Gò Vấp, TP. HCM</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface mb-8 flex items-center gap-2">
              <Building2 className="size-5" /> Thông Tin Liên Hệ
            </h4>
            <div className="space-y-3 font-body-md text-body-md text-on-surface-variant">
              <p className="text-on-surface font-label-sm flex items-center gap-1.5">
                <Building2 className="size-4 text-primary shrink-0" /> CÔNG TY TNHH SX THƯƠNG MẠI PHÙNG THỊ
              </p>
              <p className="flex items-center gap-1.5">
                <span className="size-4 shrink-0" />MST: 0 3 1 4 0 4 2 5 0 8
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="size-4 text-primary shrink-0" />
                Hotline:{" "}
                <a href="tel:0816999296" className="hover:text-primary transition-colors">0816 999 296</a>
              </p>
              <p className="flex items-center gap-1.5">
                <MessageCircle className="size-4 text-primary shrink-0" />
                Zalo: 0816 999 296
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="size-4 text-primary shrink-0" />
                Email:{" "}
                <a href="mailto:Lienhe.phungthi@gmail.com" className="hover:text-primary transition-colors">Lienhe.phungthi@gmail.com</a>
              </p>
            
            </div>
          </div>
        </div>
        <div className="border-t border-outline-variant pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body-md text-body-md text-on-surface-variant">
            © 2024 PHÙNG THỊ - Premium Trophy Manufacturing. All rights
            reserved.
          </p>
          <div className="flex gap-8 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
            <a className="hover:text-primary transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
