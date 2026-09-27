import { fetchStorefrontArticles } from "../lib/api";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import type { Route } from "./+types/sitemap-articles.xml";

const STATIC_ROUTES = ["/", "/products", "/news", "/contact", "/about"];

export async function loader({ context, request }: Route.LoaderArgs) {
  const backendFetch = getBackendServiceFetch(context);
  const origin = new URL(request.url).origin;

  let articleSlugs: string[] = [];
  try {
    let page = 1;
    const limit = 50;
    let total = 0;
    do {
      const data = await fetchStorefrontArticles({ page, limit }, backendFetch);
      articleSlugs.push(...data.items.map((a) => a.slug));
      total = data.total;
      page++;
    } while (articleSlugs.length < total);
  } catch {
    articleSlugs = [];
  }

  const urls = [
    ...STATIC_ROUTES.map((path) => ({ loc: `${origin}${path}`, lastmod: undefined as string | undefined })),
    ...articleSlugs.map((slug) => ({ loc: `${origin}/news/${slug}`, lastmod: undefined as string | undefined })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`)
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
