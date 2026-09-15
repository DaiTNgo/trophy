import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TocEntry } from "../../lib/article-toc";

export function StickyTableOfContents({ entries }: { entries: TocEntry[] }) {
  const { t } = useTranslation("news");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = document.querySelector(".prose-article");
    if (!container || entries.length === 0) return;

    const headings = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2, h3"),
    );

    entries.forEach((entry, index) => {
      const heading = headings[index];
      if (heading) heading.id = entry.id;
    });

    const observer = new IntersectionObserver(
      (intersections) => {
        const visible = intersections
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

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