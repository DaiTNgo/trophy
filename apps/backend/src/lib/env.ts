export type AppBindings = {
  // Admin compiles backend route types for Hono RPC without Worker globals.
  // Wrangler remains the deployment contract for the concrete bindings.
  DB: any;
  CUSTOMIZATION_ASSETS: any;
  ASSETS: any;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ADMIN_APP_ORIGIN?: string;
  STOREFRONT_APP_ORIGIN?: string;
};

export type AppEnv = {
  Bindings: AppBindings;
};
