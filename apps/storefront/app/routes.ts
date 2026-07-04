import { type RouteConfig, index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("products", "routes/products.tsx"),
  route("product/:handle", "routes/product.$handle.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("order-confirmation", "routes/order-confirmation.tsx"),
] satisfies RouteConfig;
