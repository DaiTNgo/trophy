import { Hono } from "hono";
import type { AppEnv } from "./lib/env";
import { AUTH_BASE_PATH, getAuth } from "./lib/auth";
import {
  CUSTOMIZATION_CORS_POLICY,
  PRODUCTS_CORS_POLICY,
  PRODUCT_ASSET_CORS_POLICY,
  SESSION_CORS_POLICY,
  createCorsMiddleware,
} from "./lib/cors";
import { adminAccountsRoute } from "./routes/admin-accounts";
import { adminBootstrapRoute } from "./routes/admin-bootstrap";
import { brandAssetsRoute } from "./routes/brand-assets";
import { customizationAssetsRoute } from "./routes/customization-assets";
import { productAssetsRoute } from "./routes/product-assets";
import { customizationsRoute } from "./routes/customizations";

import { productMetadataRoute } from "./routes/product-metadata";
import { productsRoute } from "./routes/products";
import { samplesRoute } from "./routes/samples";

const app = new Hono<AppEnv>();

app.use(`${AUTH_BASE_PATH}/*`, createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/admin/bootstrap/*", createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/admin/accounts/*", createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/customizations/*", createCorsMiddleware(CUSTOMIZATION_CORS_POLICY));
app.use("/api/brand-assets/*", createCorsMiddleware(CUSTOMIZATION_CORS_POLICY));
app.use("/api/products/*", createCorsMiddleware(PRODUCTS_CORS_POLICY));
app.use("/api/products/assets/*", createCorsMiddleware(PRODUCT_ASSET_CORS_POLICY));

app.get("/", (c) => {
  return c.json(
    {
      name: "backend",
      message: "Hono RPC backend scaffold is ready",
    },
    200,
  );
});

app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => {
  return getAuth(c.env).handler(c.req.raw);
});

export const routes = app
  .basePath("/api")
  .get("/health", (c) => c.json({ ok: true }, 200))
  .route("/admin/bootstrap", adminBootstrapRoute)
  .route("/admin/accounts", adminAccountsRoute)
  .route("/brand-assets", brandAssetsRoute)
  .route("/customizations/assets", customizationAssetsRoute)
  .route("/customizations", customizationsRoute)

  .route("/products/assets", productAssetsRoute)
  .route("/product-metadata", productMetadataRoute)
  .route("/products", productsRoute)
  .route("/samples", samplesRoute);

export type AppType = typeof routes;

export { app };
