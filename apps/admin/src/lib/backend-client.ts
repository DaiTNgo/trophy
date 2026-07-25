import { hc } from "hono/client";
import type { AppType } from "backend/client";
import { BACKEND_URL, backendFetch } from "./fetch";

export const backendClient = hc<AppType>(BACKEND_URL, {
  fetch: backendFetch,
});
