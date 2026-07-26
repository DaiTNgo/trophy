import type { StorefrontDetailResponse } from "../../lib/api";
import { getLocalized } from "../../lib/translation";

type ProductDetail = StorefrontDetailResponse["item"];

export function ProductOptionGroups({
  options,
  selectedOptionValueIds,
  locale,
  isAvailable,
  onSelect,
}: {
  options: ProductDetail["options"];
  selectedOptionValueIds: Map<number, number>;
  locale: "vi" | "en";
  isAvailable: (optionId: number, valueId: number) => boolean;
  onSelect: (optionId: number, valueId: number) => void;
}) {
  return options.map((option) => (
    <div key={option.id} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-[22px] uppercase leading-none tracking-[0.02em] text-brand-strong">
          {getLocalized(option.title, locale)}
        </p>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
          {getLocalized(
            option.values.find(
              (value) => selectedOptionValueIds.get(option.id) === value.id,
            )?.value,
            locale,
          ) || "Select"}
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {option.values.map((value) => {
          const selected = selectedOptionValueIds.get(option.id) === value.id;
          const disabled = !isAvailable(option.id, value.id);
          return (
            <button
              key={value.id}
              type="button"
              disabled={disabled}
              data-option-id={option.id}
              data-option-value-id={value.id}
              data-selected={selected}
              onClick={() => onSelect(option.id, value.id)}
              className={`h-10 rounded border px-3 text-left text-sm font-medium transition ${
                selected
                  ? "border-brand-strong bg-white text-text-base ring-2 ring-brand-strong/15"
                  : "border-border-subtle bg-white text-text-base hover:border-brand-support"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {getLocalized(value.value, locale)}
            </button>
          );
        })}
      </div>
    </div>
  ));
}
