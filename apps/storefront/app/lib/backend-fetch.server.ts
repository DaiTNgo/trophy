import { createContext } from "react-router";
import type { BackendFetch } from "./observability";

export const cloudflareContext = createContext<{
  env?: any;
  ctx?: any;
}>();

export function getBackendServiceFetch(
  context?: any,
): BackendFetch {
  try {
    const cf = context?.get ? context.get(cloudflareContext) : null;
    if (cf?.env?.BACKEND?.fetch) {
      return (input, init) => cf.env.BACKEND.fetch(input, init);
    }
  } catch {
    // ignore if context not registered
  }

  const backendBaseUrlStr =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    "http://127.0.0.1:8787";

  const backendBaseUrl = new URL(
    backendBaseUrlStr.endsWith("/") ? backendBaseUrlStr : `${backendBaseUrlStr}/`
  );

  const publicBackendUrlStr = process.env.BACKEND_URL || "http://127.0.0.1:8787";
  const publicBackendHost = new URL(publicBackendUrlStr).host;

  const isBackendHost = (host: string) => {
    return host === "localhost:8787" || host === "127.0.0.1:8787" || host === publicBackendHost;
  };

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    let targetUrl: URL;

    if (typeof input === "string") {
      if (input.startsWith("http://") || input.startsWith("https://")) {
        const parsed = new URL(input);
        if (isBackendHost(parsed.host)) {
          targetUrl = new URL(`${parsed.pathname}${parsed.search}`, backendBaseUrl);
        } else {
          targetUrl = parsed;
        }
      } else {
        targetUrl = new URL(input.replace(/^\/+/, ""), backendBaseUrl);
      }
    } else if (input instanceof URL) {
      if (isBackendHost(input.host)) {
        targetUrl = new URL(`${input.pathname}${input.search}`, backendBaseUrl);
      } else {
        targetUrl = input;
      }
    } else {
      const parsed = new URL(input.url);
      if (isBackendHost(parsed.host)) {
        targetUrl = new URL(`${parsed.pathname}${parsed.search}`, backendBaseUrl);
      } else {
        targetUrl = parsed;
      }
    }

    return fetch(targetUrl.toString(), init);
  };
}
