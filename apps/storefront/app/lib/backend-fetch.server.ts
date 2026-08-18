import { createContext } from "react-router";
import type { BackendFetch } from "./observability";

export const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

export function getBackendServiceFetch(
  context: { get: (context: typeof cloudflareContext) => { env: Env } },
): BackendFetch {
  return (input, init) => context.get(cloudflareContext).env.BACKEND.fetch(input, init);
}
