import { Hono } from "hono";
import { requireAdminSession } from "../../lib/middleware";
import type { AppEnv } from "../../lib/env";
import { adminAccountsRoute } from "./accounts";
import { adminBootstrapRoute } from "./bootstrap";
import { adminBrandAssetsRoute } from "./brand-assets";
import { customizationAssetsRoute as adminCustomizationAssetsRoute } from "./customization-assets";
import { customizationsRoute as adminCustomizationsRoute } from "./customizations/index";
import { productAssetsRoute as adminProductAssetsRoute } from "./product-assets";
import { productMetadataRoute as adminProductMetadataRoute } from "./product-metadata";
import { productsRoute as adminProductsRoute } from "./products";

export const adminRoute = new Hono<AppEnv>()
  .route("/bootstrap", adminBootstrapRoute)
  .use("*", requireAdminSession)
  .route("/accounts", adminAccountsRoute)
  .route("/brand-assets", adminBrandAssetsRoute)
  .route("/customizations/assets", adminCustomizationAssetsRoute)
  .route("/customizations", adminCustomizationsRoute)
  .route("/products/assets", adminProductAssetsRoute)
  .route("/product-metadata", adminProductMetadataRoute)
  .route("/products", adminProductsRoute);
