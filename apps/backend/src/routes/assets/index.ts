import { Hono } from "hono";
import type { AppEnv } from "../../lib/env";
import { assetsBrandsRoute } from "./brands";
import { assetsCustomizationsRoute } from "./customizations";
import { assetsProductsRoute } from "./products";

export const assetsRoute = new Hono<AppEnv>()
  .route("/products", assetsProductsRoute)
  .route("/customizations", assetsCustomizationsRoute)
  .route("/brands", assetsBrandsRoute);
