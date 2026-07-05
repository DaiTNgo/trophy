import { ChevronRight } from "lucide-react";

export function ProductBreadcrumbs({ title }: { title: string }) {
  return (
    <nav className="flex items-center gap-2 mb-8 text-on-surface-variant font-label-md uppercase">
      <a className="hover:text-primary" href="#">Home</a>
      <ChevronRight className="text-sm" />
      <a className="hover:text-primary" href="#">Collections</a>
      <ChevronRight className="text-sm" />
      <span className="text-primary font-bold">{title}</span>
    </nav>
  );
}
