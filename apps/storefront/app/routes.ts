import { type RouteConfig, index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("products", "routes/products.tsx"),
  route("product/:handle", "routes/product.$handle.tsx"),
  route("contact", "routes/contact.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("order-confirmation", "routes/order-confirmation.tsx"),
  route("order-lookup", "routes/order-lookup.tsx"),
  route("collections/:handle", "routes/collections.$handle.tsx"),
] satisfies RouteConfig;
