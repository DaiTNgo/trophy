import { Hono } from "hono";
import { getAdminSession } from "../../lib/admin-session";
import { requireAdminSession } from "../../lib/middleware";
import type { AppEnv } from "../../lib/env";
import { adminAccountsRoute } from "./accounts";
import { adminBootstrapRoute } from "./bootstrap";
import { adminBrandAssetsRoute } from "./brand-assets";
import { customizationAssetsRoute as adminCustomizationAssetsRoute } from "./customization-assets";
import { customizationsRoute as adminCustomizationsRoute } from "./customizations/index";
import { adminOrdersRoute } from "./orders";
import { productAssetsRoute as adminProductAssetsRoute } from "./product-assets";
import { productMetadataRoute as adminProductMetadataRoute } from "./product-metadata";
import { productsRoute as adminProductsRoute } from "./products";

export const adminRoute = new Hono<AppEnv>()
  .route("/bootstrap", adminBootstrapRoute)
  .get("/me", async (c) => {
    const session = await getAdminSession(c.env, c.req.raw.headers);

    if (!session?.user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    return c.json(
      {
        user: {
          id: session.user.id,
          username: (session.user as any).username ?? session.user.email,
          email: session.user.email,
        // @ts-ignore
          name: session.user.name,
          role: (session.user as any).role,
        // @ts-ignore
          banned: (session.user as any).banned,
        },
      },
      200,
    );
  })
  .use("*", requireAdminSession)
  .route("/accounts", adminAccountsRoute)
  .route("/brand-assets", adminBrandAssetsRoute)
  .route("/customizations/assets", adminCustomizationAssetsRoute)
  .route("/customizations", adminCustomizationsRoute)
  .route("/orders", adminOrdersRoute)
  .route("/products/assets", adminProductAssetsRoute)
  .route("/product-metadata", adminProductMetadataRoute)
  .route("/products", adminProductsRoute);
