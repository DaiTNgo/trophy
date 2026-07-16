import {
  Mail,
  MapPin,
  MessageCircle,
  Phone
} from "lucide-react";
import { Link } from "react-router";
import Container from "../container";

export function Footer() {
  return (
    <footer className="bg-surface-dark py-20">
      <Container>
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-8 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                Liên Kết Nhanh
              </h4>
              <ul className="space-y-4 font-body-md text-body-md text-white/72">
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Về Phùng Thị
                  </a>
                </li>
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/products">
                    Tất cả sản phẩm
                  </Link>
                </li>
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Dự án tiêu biểu
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Tin tức &amp; Sự kiện
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                Hỗ Trợ Khách Hàng
              </h4>
              <ul className="space-y-4 font-body-md text-body-md text-white/72">
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Chính sách bảo hành
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Hướng dẫn đặt hàng
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-brand-accent" href="#">
                    Vận chuyển &amp; Thanh toán
                  </a>
                </li>
                <li>
                  <Link className="transition-colors hover:text-brand-accent" to="/order-lookup">
                    Tra cứu đơn hàng
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 flex items-center gap-2 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                Xưởng Sản Xuất
              </h4>
              <div className="space-y-6 font-body-md text-body-md text-white/72">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-label-sm text-white">
                    <MapPin className="size-4" />
                    Miền Bắc
                  </p>
                  <p className="ml-6">Thôn 2, xã Hòa Lạc, TP. Hà Nội</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-label-sm text-white">
                    <MapPin className="size-4" />
                    Miền Nam
                  </p>
                  <p className="ml-6">
                    1264/47 Lê Đức Thọ, Phường 13, Gò Vấp, TP. HCM
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-8 flex items-center gap-2 font-heading text-[26px] uppercase leading-none tracking-[0.03em] text-white">
                Thông Tin Liên Hệ
              </h4>
              <div className="space-y-3 font-body-md text-body-md text-white/72">
                <p className="flex items-center gap-1.5 font-label-sm text-white">
                  CÔNG TY TNHH SX THƯƠNG MẠI PHÙNG THỊ
                </p>
                <p className="flex items-center gap-1.5 italic">
                  MST: 0314042508
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0" />
                  Hotline:
                  <a
                    href="tel:0816999296"
                    className="transition-colors hover:text-brand-accent"
                  >
                    0816 999 296
                  </a>
                </p>
                <p className="flex items-center gap-1.5">
                  <MessageCircle className="size-4 shrink-0 " />
                  Zalo: 0816 999 296
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="size-4 shrink-0" />
                  Email:
                  <a
                    href="mailto:Lienhe.phungthi@gmail.com"
                    className="transition-colors hover:text-brand-accent"
                  >
                    Lienhe.phungthi@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/12 pt-8 md:flex-row">
            <p className="font-body-md text-body-md text-white/60">
              © 2024 PHÙNG THỊ - Premium Trophy Manufacturing. All rights reserved.
            </p>
            <div className="flex gap-8 font-label-md text-label-md uppercase tracking-widest text-white/60">
              <a className="transition-colors hover:text-brand-accent" href="#">
                Privacy Policy
              </a>
              <a className="transition-colors hover:text-brand-accent" href="#">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
