import type { Route } from "./+types/checkout";
import { CheckoutProgress } from "../components/checkout/CheckoutProgress";
import { BillingDetails } from "../components/checkout/BillingDetails";
import { ShippingMethod } from "../components/checkout/ShippingMethod";
import { CheckoutSummary } from "../components/checkout/CheckoutSummary";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thanh Toán | Phùng Thị - Chế Tác Vinh Quang" },
    { name: "description", content: "Thanh toán đơn hàng của bạn tại Phùng Thị" },
  ];
}

export default function Checkout() {
  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="flex-grow max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        <CheckoutProgress />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-12">
            <BillingDetails />
            <ShippingMethod />
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <CheckoutSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
