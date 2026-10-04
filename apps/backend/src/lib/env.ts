import { getStorage } from "./storage";

export type AppBindings = {
  DB?: any;
  CUSTOMIZATION_ASSETS?: any;
  ASSETS?: any;
  DATABASE_URL?: string;
  STORAGE_DIR?: string;
  PORT?: string | number;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ADMIN_APP_ORIGIN?: string;
  STOREFRONT_APP_ORIGIN?: string;
  MISA_CLIENT_ID?: string;
  MISA_CLIENT_SECRET?: string;
  MISA_API_BASE_URL?: string;
};

export type AppEnv = {
  Bindings: AppBindings;
};

/**
 * Consolidates environment variable fallback resolution and resource initialization.
 */
export function getAppBindings(base: Partial<AppBindings> = {}): AppBindings {
  const storageDir = base.STORAGE_DIR || process.env.STORAGE_DIR;
  return {
    ...base,
    DATABASE_URL: base.DATABASE_URL || process.env.DATABASE_URL,
    STORAGE_DIR: storageDir,
    PORT: base.PORT || process.env.PORT,
    BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: base.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL,
    ADMIN_APP_ORIGIN: base.ADMIN_APP_ORIGIN || process.env.ADMIN_APP_ORIGIN,
    STOREFRONT_APP_ORIGIN: base.STOREFRONT_APP_ORIGIN || process.env.STOREFRONT_APP_ORIGIN,
    MISA_CLIENT_ID: base.MISA_CLIENT_ID || process.env.MISA_CLIENT_ID,
    MISA_CLIENT_SECRET: base.MISA_CLIENT_SECRET || process.env.MISA_CLIENT_SECRET,
    MISA_API_BASE_URL: base.MISA_API_BASE_URL || process.env.MISA_API_BASE_URL,
    CUSTOMIZATION_ASSETS: base.CUSTOMIZATION_ASSETS || getStorage(storageDir),
  };
}
