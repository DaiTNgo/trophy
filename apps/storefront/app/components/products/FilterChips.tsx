export interface FilterChipsProps {
  categories: string[];
  activeCategory?: string;
  onSelect?: (category: string) => void;
}

export function FilterChips({ categories, activeCategory, onSelect }: FilterChipsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
      {categories.map((category) => {
        const isActive = category === activeCategory;
        return (
          <button
            key={category}
            onClick={() => onSelect?.(category)}
            className={`whitespace-nowrap px-6 py-2 rounded-full font-label-md text-label-md border transition-all duration-300 ${
              isActive
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-low hover:bg-surface-variant border-outline-variant text-on-surface-variant"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
