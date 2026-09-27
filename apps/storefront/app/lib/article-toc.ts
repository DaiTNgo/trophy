export type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base || "section";
}

/**
 * Scans article HTML for h2/h3 headings so the sticky Table of Contents can be
 * rendered server-side (no blank placeholder column on the detail page) while
 * using the same id generation as the client-side hydration pass.
 */
export function scanTocFromHtml(html: string): TocEntry[] {
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();

  for (const match of html.matchAll(headingRe)) {
    const level = match[1] === "3" ? 3 : 2;
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (!text) continue;

    let id = slugifyHeading(text);
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count + 1}`;
    seen.set(id, count + 1);

    entries.push({ id, text, level });
  }

  return entries;
}