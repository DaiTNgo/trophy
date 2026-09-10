import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugifyHeading(text: string): string {
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

export function StickyTableOfContents() {
  const { t } = useTranslation("news");
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = document.querySelector(".prose-article");
    if (!container) return;

    const headings = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2, h3"),
    ).filter((h) => h.textContent?.trim());

    const seen = new Map<string, number>();
    headings.forEach((h, index) => {
      let id = slugifyHeading(h.textContent!.trim());
      const count = seen.get(id) ?? 0;
      if (count > 0) id = `${id}-${count + 1}`;
      seen.set(id, count + 1);
      h.id = id;
      h.dataset.tocIndex = String(index);
    });

    setEntries(
      headings.map((h) => ({
        id: h.id,
        text: h.textContent!.trim(),
        level: h.tagName === "H2" ? 2 : 3,
      })),
    );

    const observer = new IntersectionObserver(
      (entriesIn) => {
        const visible = entriesIn
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const target = visible[0].target as HTMLElement;
          setActiveId(target.id);
        }
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (entries.length < 2) return null;

  return (
    <nav className="sticky top-[140px] hidden max-h-[60vh] overflow-y-auto rounded-xl border border-gray-100 bg-white p-5 xl:block">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
        {t("table_of_contents")}
      </p>
      <ul className="space-y-2.5">
        {entries.map((entry) => (
          <li key={entry.id} style={{ paddingLeft: entry.level === 3 ? 12 : 0 }}>
            <a
              href={`#${entry.id}`}
              onClick={() => setActiveId(entry.id)}
              className={`block text-sm leading-snug transition-colors ${
                activeId === entry.id
                  ? "font-semibold text-brand-support"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}