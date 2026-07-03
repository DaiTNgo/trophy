export function ProductBreadcrumbs({ title }: { title: string }) {
  return (
    <nav className="flex items-center gap-2 mb-8 text-on-surface-variant font-label-md uppercase">
      <a className="hover:text-primary" href="#">Home</a>
      <span className="material-symbols-outlined text-sm">chevron_right</span>
      <a className="hover:text-primary" href="#">Collections</a>
      <span className="material-symbols-outlined text-sm">chevron_right</span>
      <span className="text-primary font-bold">{title}</span>
    </nav>
  );
}
