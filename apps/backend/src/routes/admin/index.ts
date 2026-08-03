import { Hono } from "hono";
import { getAdminSession } from "../../lib/admin-session";
import { requireAdminSession } from "../../lib/middleware";
import type { AppEnv } from "../../lib/env";
import { adminAccountsRoute } from "./accounts";
import { adminBootstrapRoute } from "./bootstrap";
import { adminBrandAssetsRoute } from "./brand-assets";
import { adminClipartRoute } from "./clipart";
import { customizationAssetsRoute as adminCustomizationAssetsRoute } from "./customization-assets";
import { customizationsRoute as adminCustomizationsRoute } from "./customizations/index";
import { adminOrdersRoute } from "./orders";
import { adminMisaRoute } from "./misa";
import { adminOnboardingRoute } from "./onboarding";
import { productAssetsRoute as adminProductAssetsRoute } from "./product-assets";
import { productMetadataRoute as adminProductMetadataRoute } from "./product-metadata";
import { productsRoute as adminProductsRoute } from "./products";
import { superAdminRoute } from "./super-admin";

export const adminRoute = new Hono<AppEnv>()
  .route("/bootstrap", adminBootstrapRoute)
  .route("/onboarding", adminOnboardingRoute)
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
  .route("/super-admin", superAdminRoute)
  .route("/brand-assets", adminBrandAssetsRoute)
  .route("/customization/clipart", adminClipartRoute)
  .route("/customizations/assets", adminCustomizationAssetsRoute)
  .route("/customizations", adminCustomizationsRoute)
  .route("/orders", adminOrdersRoute)
  .route("/misa", adminMisaRoute)
  .route("/products/assets", adminProductAssetsRoute)
  .route("/product-metadata", adminProductMetadataRoute)
  .route("/products", adminProductsRoute);
