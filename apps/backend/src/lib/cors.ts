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

export const PRODUCT_ASSET_CORS_POLICY: CorsPolicy = {
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  exposeHeaders: ["Content-Length", "ETag"],
};

export function buildBackendAllowedOrigins(extraOrigins: Array<string | undefined>) {
  return Array.from(
    new Set(
      [...extraOrigins, ...LOCAL_APP_ORIGINS].filter(
        (origin): origin is string => Boolean(origin),
      ),
    ),
  );
}
