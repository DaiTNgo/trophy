export interface CategoryOption {
  name: string;
  handle: string;
}

export interface FilterChipsProps {
  categories: CategoryOption[];
  activeCategory?: string;
  onSelect?: (category: string) => void;
}

export function FilterChips({ categories, activeCategory, onSelect }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {categories.map((cat) => {
        const isActive = cat.handle === activeCategory || (!activeCategory && cat.handle === "");
        return (
          <button
            key={cat.handle}
            onClick={() => onSelect?.(cat.handle)}
            className={`whitespace-nowrap rounded-sm border px-4 py-2.5 font-label-md text-[11px] uppercase tracking-[0.14em] transition-colors ${
              isActive
                ? "border-brand-strong bg-brand-strong text-white"
                : "border-border-subtle bg-surface-base text-on-surface-variant hover:border-brand-support hover:text-brand-support"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
