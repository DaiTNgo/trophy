import { Hono } from "hono";
import type { AppEnv } from "./lib/env";
import { AUTH_BASE_PATH, getAuth } from "./lib/auth";
import {
  SESSION_CORS_POLICY,
  STOREFRONT_CORS_POLICY,
  createCorsMiddleware,
} from "./lib/cors";
import { adminRoute } from "./routes/admin";
import { storefrontRoute } from "./routes/storefront";

const app = new Hono<AppEnv>();

app.use("/api/admin/*", createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/storefront/*", createCorsMiddleware(STOREFRONT_CORS_POLICY));

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
  .route("/admin", adminRoute)
  .route("/storefront", storefrontRoute);

export type AppType = typeof routes;

export { app };
