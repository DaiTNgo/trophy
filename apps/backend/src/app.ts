import { Hono } from "hono";
import type { AppEnv } from "./lib/env";
import { AUTH_BASE_PATH, getAuth } from "./lib/auth";
import {
  SESSION_CORS_POLICY,
  STOREFRONT_CORS_POLICY,
  createCorsMiddleware,
  getAppCorsOrigins,
} from "./lib/cors";
import { adminRoute } from "./routes/admin";
import { storefrontRoute } from "./routes/storefront";

const app = new Hono<AppEnv>();

app.use("/api/storefront/*", async (c, next) => {
  const startedAt = Date.now();
  const url = new URL(c.req.url);

  console.log(
    "[backend]",
    JSON.stringify({
      event: "storefront.request",
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: url.pathname,
      search: url.search || null,
      origin: c.req.header("origin") ?? null,
      cfRay: c.req.header("cf-ray") ?? null,
    }),
  );

  try {
    await next();
  } finally {
    console.log(
      "[backend]",
      JSON.stringify({
        event: "storefront.response",
        timestamp: new Date().toISOString(),
        method: c.req.method,
        path: url.pathname,
        status: c.res.status,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
});

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

app.onError((err, c) => {
  console.error(
    "[backend error]",
    JSON.stringify({
      event: "unhandled.error",
      timestamp: new Date().toISOString(),
      path: c.req.path,
      method: c.req.method,
      message: err.message,
      stack: err.stack,
    }),
  );

  const requestOrigin = c.req.header("origin");
  const allowedOrigins = getAppCorsOrigins(c.env);
  const isPublic =
    c.req.path.startsWith("/api/assets") ||
    c.req.path.startsWith("/fonts") ||
    c.req.path.startsWith("/api/storefront");

  const origin = isPublic
    ? "*"
    : allowedOrigins.includes(requestOrigin ?? "")
      ? requestOrigin
      : allowedOrigins[0] ?? "*";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    Vary: "Origin, Access-Control-Request-Headers",
  };

  if (origin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return c.json(
    {
      error: err.message || "Internal Server Error",
    },
    500,
    headers,
  );
});

export const routes = app
  .basePath("/api")
  .get("/health", (c) => c.json({ ok: true }, 200))
  .route("/admin", adminRoute)
  .route("/storefront", storefrontRoute);

export type AppType = typeof routes;

export { app };
