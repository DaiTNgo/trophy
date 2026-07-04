import { Hono } from "hono";
import type { AppEnv } from "../../lib/env";
import { storefrontBrandAssetsRoute } from "./brand-assets";
import { storefrontCategoriesRoute } from "./categories";
import { storefrontCollectionsRoute } from "./collections";
import { storefrontProductsRoute } from "./products";
import { customizationAssetsRoute as storefrontCustomizationAssetsRoute } from "./customization-assets";
import { customizationsRoute as storefrontCustomizationsRoute } from "./customizations/index";
import { storefrontOrdersRoute } from "./orders";

export const storefrontRoute = new Hono<AppEnv>()
  .route("/brand-assets", storefrontBrandAssetsRoute)
  .route("/categories", storefrontCategoriesRoute)
  .route("/collections", storefrontCollectionsRoute)
  .route("/products", storefrontProductsRoute)
  .route("/customizations/assets", storefrontCustomizationAssetsRoute)
  .route("/customizations", storefrontCustomizationsRoute)
  .route("/orders", storefrontOrdersRoute);

