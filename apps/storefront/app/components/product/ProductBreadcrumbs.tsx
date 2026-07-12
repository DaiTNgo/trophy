import { ChevronRight } from "lucide-react";

export function ProductBreadcrumbs({ title }: { title: string }) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
      <a className="transition hover:text-brand-strong" href="#">Home</a>
      <ChevronRight className="size-3.5" />
      <a className="transition hover:text-brand-strong" href="#">Collections</a>
      <ChevronRight className="size-3.5" />
      <span className="max-w-[46ch] truncate text-brand-strong">{title}</span>
    </nav>
  );
}
