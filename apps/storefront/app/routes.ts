import { type RouteConfig, index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("customize", "routes/customize.tsx"),
  route("customize/:templateId", "routes/customize.$templateId.tsx"),
] satisfies RouteConfig;
