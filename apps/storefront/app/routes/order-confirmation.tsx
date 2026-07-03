import type { Route } from "./+types/order-confirmation";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { OrderConfirmationMessage } from "../components/checkout/OrderConfirmationMessage";
import { OrderDetails } from "../components/checkout/OrderDetails";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cảm ơn bạn - PHÙNG THỊ" },
    { name: "description", content: "Xác nhận đơn hàng thành công tại Phùng Thị" },
  ];
}

export default function OrderConfirmation() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <main className="relative flex-grow pt-12 pb-24 overflow-hidden">
        {/* Atmospheric Background Element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] -z-10" style={{ background: 'radial-gradient(circle at center, rgba(254, 160, 12, 0.05) 0%, transparent 70%)' }}></div>
        
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Success Messaging & Trophy Display */}
            <div className="lg:col-span-7">
              <OrderConfirmationMessage />
            </div>

            {/* Order Summary Side Panel */}
            <div className="lg:col-span-5">
              <OrderDetails />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
