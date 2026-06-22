import { Hono } from "hono";
import type { AppEnv } from "./lib/env";
import { AUTH_BASE_PATH, getAuth, getAuthSettings } from "./lib/auth";
import {
  buildBackendAllowedOrigins,
  CUSTOMIZATION_CORS_POLICY,
  LOCAL_APP_ORIGINS,
  SESSION_CORS_POLICY,
  type CorsPolicy,
} from "./lib/cors";
import { adminBootstrapRoute } from "./routes/admin-bootstrap";
import { customizationAssetsRoute } from "./routes/customization-assets";
import { customizationsRoute } from "./routes/customizations";
import { productMetadataRoute } from "./routes/product-metadata";
import { productsRoute } from "./routes/products";
import { samplesRoute } from "./routes/samples";

const app = new Hono<AppEnv>();

function getAllowedAppOrigins(env: AppEnv["Bindings"]) {
  return buildBackendAllowedOrigins([
    ...getAuthSettings(env).trustedOrigins,
    env.STOREFRONT_APP_ORIGIN,
  ]);
}

function isAllowedAppOrigin(requestOrigin: string | undefined, allowedOrigins: string[]) {
  return Boolean(requestOrigin && allowedOrigins.includes(requestOrigin));
}

function buildAllowedCorsHeaders(
  requestOrigin: string,
  policy: CorsPolicy,
) {
  return buildCorsHeaders(requestOrigin, [requestOrigin], policy);
}

function applyCorsHeaders(c: Parameters<typeof app.use>[1] extends (c: infer C, next: infer N) => any ? C : never, headers: Headers) {
  headers.forEach((value, key) => {
    c.header(key, value);
  });
}

function createCorsMiddleware(policy: CorsPolicy) {
  return async (
    c: Parameters<typeof app.use>[1] extends (c: infer C, next: infer N) => any ? C : never,
    next: Parameters<typeof app.use>[1] extends (c: any, next: infer N) => any ? N : never,
  ) => {
    const requestOrigin = c.req.header("origin");
    if (!requestOrigin) {
      return next();
    }

    const allowedOrigins = getAllowedAppOrigins(c.env);
    if (!isAllowedAppOrigin(requestOrigin, allowedOrigins)) {
      return c.body(null, 403);
    }

    const headers = buildAllowedCorsHeaders(requestOrigin, policy);

    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers,
      });
    }

    await next();

    applyCorsHeaders(c, headers);
  };
}

function resolveCorsOrigin(requestOrigin: string | undefined, allowedOrigins: string[]) {
  if (!requestOrigin) {
    return allowedOrigins[0] ?? LOCAL_APP_ORIGINS[0];
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] ?? LOCAL_APP_ORIGINS[0];
}

function buildCorsHeaders(
  requestOrigin: string | undefined,
  allowedOrigins: string[],
  policy: CorsPolicy,
) {
  const headers = new Headers();

  headers.set("Access-Control-Allow-Origin", resolveCorsOrigin(requestOrigin, allowedOrigins));
  headers.set("Vary", "Origin, Access-Control-Request-Headers");
  headers.set("Access-Control-Allow-Methods", policy.allowMethods.join(", "));
  headers.set("Access-Control-Allow-Headers", policy.allowHeaders.join(", "));

  if (policy.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (policy.exposeHeaders?.length) {
    headers.set("Access-Control-Expose-Headers", policy.exposeHeaders.join(", "));
  }

  headers.set("Access-Control-Max-Age", "600");

  return headers;
}

app.use(`${AUTH_BASE_PATH}/*`, createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/admin/bootstrap/*", createCorsMiddleware(SESSION_CORS_POLICY));
app.use("/api/customizations/*", createCorsMiddleware(CUSTOMIZATION_CORS_POLICY));

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
  .route("/customizations/assets", customizationAssetsRoute)
  .route("/customizations", customizationsRoute)
  .route("/product-metadata", productMetadataRoute)
  .route("/products", productsRoute)
  .route("/samples", samplesRoute);

export type AppType = typeof routes;

export { app };
