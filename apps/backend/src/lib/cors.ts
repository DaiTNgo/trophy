import type { Context, Next } from "hono";
import type { AppEnv } from "./env";

export const LOCAL_APP_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
];

export type CorsPolicy = {
  allowHeaders: string[];
  allowMethods: string[];
  credentials?: boolean;
  exposeHeaders?: string[];
};

export const SESSION_CORS_POLICY: CorsPolicy = {
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  exposeHeaders: ["Content-Length"],
};

export const CUSTOMIZATION_CORS_POLICY: CorsPolicy = {
  allowHeaders: ["Content-Type", "X-Upload-Token"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  exposeHeaders: ["Content-Length", "ETag"],
};

export const PRODUCTS_CORS_POLICY: CorsPolicy = {
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  exposeHeaders: ["Content-Length"],
};

export const PRODUCT_ASSET_CORS_POLICY: CorsPolicy = {
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  exposeHeaders: ["Content-Length", "ETag"],
};

function splitOrigins(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAppCorsOrigins(bindings: Partial<AppEnv["Bindings"]>) {
  return Array.from(
    new Set(
      [
        ...splitOrigins(bindings.ADMIN_APP_ORIGIN),
        ...splitOrigins(bindings.STOREFRONT_APP_ORIGIN),
        ...LOCAL_APP_ORIGINS,
      ].filter(Boolean),
    ),
  );
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

export function createCorsMiddleware(policy: CorsPolicy) {
  return async (c: Context<AppEnv>, next: Next) => {
    const requestOrigin = c.req.header("origin");
    if (!requestOrigin) {
      return next();
    }

    const allowedOrigins = getAppCorsOrigins(c.env);
    if (!allowedOrigins.includes(requestOrigin)) {
      return c.body(null, 403);
    }

    const headers = buildCorsHeaders(requestOrigin, allowedOrigins, policy);

    if (c.req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    await next();

    headers.forEach((value, key) => {
      c.header(key, value);
    });
  };
}
