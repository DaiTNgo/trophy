import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const SANS_BYTES = new Uint8Array([1, 2, 3]);
const UPLOADED_BYTES = new Uint8Array([9, 8, 7]);

function mockFetch(files: Record<string, Uint8Array>) {
  const fetchMock = vi.fn(async (url: string) => {
    const hit = Object.entries(files).find(([suffix]) => url.endsWith(suffix));
    return hit
      ? new Response(hit[1] as BodyInit, { status: 200 })
      : new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("loadFontBytes", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns bytes without a warning for a default font", async () => {
    mockFetch({ "/fonts/Sans-Bold.ttf": SANS_BYTES });
    const { loadFontBytes } = await import("./pdf-fonts");

    await expect(loadFontBytes("sans-bold")).resolves.toEqual({ bytes: SANS_BYTES, unavailable: false });
  });

  it("returns bytes without a warning for an uploaded Brand Font", async () => {
    mockFetch({
      "/api/storefront/brand-assets/fonts/file/font_abc": UPLOADED_BYTES,
      "/fonts/Sans-Regular.ttf": SANS_BYTES,
    });
    const { loadFontBytes } = await import("./pdf-fonts");

    await expect(loadFontBytes("font_abc")).resolves.toEqual({ bytes: UPLOADED_BYTES, unavailable: false });
  });

  it("flags a missing Brand Font as unavailable while still returning default Sans", async () => {
    mockFetch({ "/fonts/Sans-Regular.ttf": SANS_BYTES });
    const { loadFontBytes } = await import("./pdf-fonts");

    await expect(loadFontBytes("font_deleted")).resolves.toEqual({ bytes: SANS_BYTES, unavailable: true });
  });

  it("flags an unavailable font even when the default fallback is unreachable", async () => {
    mockFetch({});
    const { loadFontBytes } = await import("./pdf-fonts");

    await expect(loadFontBytes("font_deleted")).resolves.toEqual({ bytes: null, unavailable: true });
  });
});
