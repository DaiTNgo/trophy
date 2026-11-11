import { Hono } from "hono";
import type { AppEnv } from "../../lib/env";
import { storefrontBrandAssetsRoute } from "./brand-assets";
import { storefrontCategoriesRoute } from "./categories";
import { storefrontCollectionsRoute } from "./collections";
import { storefrontProductsRoute } from "./products";
import { customizationAssetsRoute as storefrontCustomizationAssetsRoute } from "./customization-assets";
import { storefrontOrdersRoute } from "./orders";
import { storefrontPaymentsRoute } from "./payments";
import { storefrontArticlesRoute } from "./articles";

export const storefrontRoute = new Hono<AppEnv>()
  .route("/brand-assets", storefrontBrandAssetsRoute)
  .route("/categories", storefrontCategoriesRoute)
  .route("/collections", storefrontCollectionsRoute)
  .route("/products", storefrontProductsRoute)
  .route("/customizations/assets", storefrontCustomizationAssetsRoute)
  .route("/orders", storefrontOrdersRoute)
  .route("/payments", storefrontPaymentsRoute)
  .route("/articles", storefrontArticlesRoute);
