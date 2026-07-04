import type { Route } from "./+types/cart";
import { Link } from "react-router";
import { CartItemList } from "../components/cart/CartItemList";
import { OrderSummary } from "../components/cart/OrderSummary";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Giỏ Hàng | Phùng Thị - Chế Tác Vinh Quang" },
    { name: "description", content: "Giỏ hàng của bạn tại Phùng Thị" },
  ];
}

export default function Cart() {
  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center space-x-2 text-on-surface-variant font-label-md text-label-md">
          <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-bold">Giỏ hàng</span>
        </nav>

        {/* Page Title */}
        <h1 className="font-headline-lg text-headline-lg mb-12 tracking-wider text-on-background uppercase">GIỎ HÀNG CỦA BẠN</h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column: Product List (70%) */}
          <div className="lg:w-[70%]">
            <CartItemList />

            <div className="mt-8">
              <Link to="/products" className="inline-flex items-center text-primary font-bold font-label-md text-label-md uppercase tracking-wider hover:translate-x-[-4px] transition-transform duration-300">
                <span className="material-symbols-outlined mr-2">arrow_back</span>
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary (30%) */}
          <div className="lg:w-[30%]">
            <OrderSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
