export type AppBindings = CloudflareBindings & {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ADMIN_APP_ORIGIN?: string;
  STOREFRONT_APP_ORIGIN?: string;
  ADMIN_BOOTSTRAP_SECRET?: string;
};

export type AppEnv = {
  Bindings: AppBindings;
};
