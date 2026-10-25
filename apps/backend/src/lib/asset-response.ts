import type { AppBindings } from "./env";
import { getStaticFontBytes } from "./static-fonts";
import type { StorageObject } from "./storage";

// Asset URLs are public capability URLs keyed by immutable ids, so they can be cached forever.
const PUBLIC_IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

function setImmutableHeaders(headers: Headers, extraHeaders: Record<string, string>) {
  headers.set("cache-control", PUBLIC_IMMUTABLE_CACHE);
  headers.set("x-content-type-options", "nosniff");
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return headers;
}

function immutableHeaders(extraHeaders: Record<string, string>) {
  return setImmutableHeaders(new Headers(), extraHeaders);
}

/** Streams a stored object with its content type, etag and long-lived cache headers. */
export function storageObjectResponse(object: StorageObject, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers: setImmutableHeaders(headers, extraHeaders) });
}

/**
 * Serves a bundled static font by name or alias, otherwise the font stored at `storageKey`.
 * Returns null when neither exists so each route keeps its own 404 body.
 */
export async function fontResponse(env: AppBindings, name: string, storageKey: string) {
  const staticBytes = getStaticFontBytes(name);
  if (staticBytes) {
    return new Response(staticBytes, { headers: immutableHeaders({ "content-type": "font/ttf" }) });
  }

  const object = await env.CUSTOMIZATION_ASSETS?.get(storageKey);
  return object ? storageObjectResponse(object) : null;
}
