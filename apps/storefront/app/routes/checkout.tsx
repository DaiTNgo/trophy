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

import { Form, redirect } from "react-router";
import { createStorefrontOrder } from "../lib/api";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  
  const name = (formData.get("customer.name") as string) || "Nguyễn Văn A";
  const phone = (formData.get("customer.phone") as string) || "0901234567";
  const email = (formData.get("customer.email") as string) || "";
  
  const addressLine = (formData.get("shipping.primaryAddress.line1") as string) || "123 Đường Số 1";
  const city = (formData.get("shipping.primaryAddress.city") as string) || "Hồ Chí Minh";
  const paymentMethod = (formData.get("shipping") as string === "express") ? "cash_on_delivery" : "bank_transfer";
  
  try {
    const response = await createStorefrontOrder({
      customer: { name, phone, email },
      shipping: {
        primaryAddress: { line1: addressLine, city, country: "VN" },
        shipToDifferentAddress: false,
      },
      payment: {
        method: "bank_transfer", // Always bank transfer for mocked flow
      },
      items: [
        {
          productId: 1, // Mock product ID
          variantId: 10, // Mock variant ID
          quantity: 1,
        }
      ]
    });
    return redirect(`/order-confirmation?orderNumber=${response.order.orderNumber}`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create order" };
  }
}

export default function Checkout() {
  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="flex-grow max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        <CheckoutProgress />

        <Form method="post" className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-12">
            <BillingDetails />
            <ShippingMethod />
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <CheckoutSummary />
          </div>
        </Form>
      </main>
    </div>
  );
}
