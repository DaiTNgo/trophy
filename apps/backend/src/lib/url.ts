import { Context } from "hono";

export function toAbsoluteAssetUrl(c: Context, url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    // If it's already a valid absolute URL (http, https, blob, data), return it as is.
    // Also tolerate other schemes just in case.
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
      return url;
    }

    let reqUrlStr = c.req.url;
    if (reqUrlStr.startsWith("/")) {
      const host = c.req.header("host") || "localhost:8787";
      // Use http in local dev when req.url is relative
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      reqUrlStr = `${protocol}://${host}${reqUrlStr}`;
    }

    const reqUrl = new URL(reqUrlStr);
    // backend-local paths should be resolved against the request origin
    return new URL(url, reqUrl.origin).toString();
  } catch (e) {
    // Fallback if URL parsing fails
    return url;
  }
}

export function makeCustomizationUrlsAbsolute(c: Context, obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => makeCustomizationUrlsAbsolute(c, item));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "previewUrl" && typeof value === "string") {
      result[key] = toAbsoluteAssetUrl(c, value);
    } else if (value !== null && typeof value === "object") {
      result[key] = makeCustomizationUrlsAbsolute(c, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
