import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("components/layout/storefront-layout.tsx", [
    index("routes/home.tsx"),
    route("products", "routes/products.tsx"),
    route("categories/:categoryHandle", "routes/categories.$categoryHandle.tsx"),
    route(
      "categories/:categoryHandle/products/:productHandle",
      "routes/categories.$categoryHandle.products.$productHandle.tsx",
    ),
    route("product/:handle", "routes/product.$handle.tsx"),
    route("contact", "routes/contact.tsx"),
    route("about", "routes/about.tsx"),
    route("cart", "routes/cart.tsx"),
    route("order-confirmation", "routes/order-confirmation.tsx"),
    route("order-lookup", "routes/order-lookup.tsx"),
    route("collections/:handle", "routes/collections.$handle.tsx"),
  ]),
  route("checkout", "routes/checkout.tsx"),
  route("api/locale", "routes/api.locale.ts"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
