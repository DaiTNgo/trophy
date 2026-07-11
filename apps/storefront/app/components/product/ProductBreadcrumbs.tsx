import { ChevronRight } from "lucide-react";

export function ProductBreadcrumbs({ title }: { title: string }) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#7b6b5f]">
      <a className="transition hover:text-[#110023]" href="#">Home</a>
      <ChevronRight className="size-3.5" />
      <a className="transition hover:text-[#110023]" href="#">Collections</a>
      <ChevronRight className="size-3.5" />
      <span className="max-w-[46ch] truncate text-[#2d4056]">{title}</span>
    </nav>
  );
}
