import { useTranslation } from "react-i18next";
import type { StorefrontDetailResponse } from "../../lib/api";
import { getLocalized } from "../../lib/translation";

type ProductDetail = StorefrontDetailResponse["item"];

export type OptionValueStatus = "available" | "pivotable" | "disabled";

export function ProductOptionGroups({
  options,
  selectedOptionValueIds,
  locale,
  getOptionValueStatus,
  isAvailable,
  onSelect,
}: {
  options: ProductDetail["options"];
  selectedOptionValueIds: Map<number, number>;
  locale: "vi" | "en";
  getOptionValueStatus?: (optionId: number, valueId: number) => OptionValueStatus;
  isAvailable?: (optionId: number, valueId: number) => boolean;
  onSelect: (optionId: number, valueId: number) => void;
}) {
  const { t } = useTranslation("products");

  return options.map((option) => {
    const selectedValue = option.values.find(
      (value) => selectedOptionValueIds.get(option.id) === value.id,
    );
    const selectedValueText = selectedValue
      ? getLocalized(selectedValue.value, locale)
      : t("option_select_fallback");

    const displayType = option.displayType ?? "text";

    return (
      <div key={option.id} className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-[22px] uppercase leading-none tracking-[0.02em] text-brand-strong">
            {getLocalized(option.title, locale)}
          </p>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
            {selectedValueText}
          </span>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2">
          {option.values.map((value) => {
            const selected = selectedOptionValueIds.get(option.id) === value.id;
            const status: OptionValueStatus = getOptionValueStatus
              ? getOptionValueStatus(option.id, value.id)
              : isAvailable
                ? isAvailable(option.id, value.id)
                  ? "available"
                  : "disabled"
                : "available";

            const disabled = status === "disabled";
            const isPivotable = status === "pivotable";
            const label = getLocalized(value.value, locale);
            const hex = value.colorHex?.trim() || "#cccccc";

            let stateClasses = "border-border-subtle bg-white text-text-base hover:border-brand-support";
            if (selected) {
              stateClasses = "border-brand-strong bg-white text-text-base ring-2 ring-brand-strong/15 font-semibold";
            } else if (isPivotable) {
              stateClasses = "border-dashed border-border-subtle bg-surface-subtle/40 text-text-muted hover:border-brand-support hover:bg-surface-subtle hover:text-text-base cursor-pointer";
            } else if (disabled) {
              stateClasses = "border-border-subtle bg-surface-subtle/20 text-text-muted/60 opacity-30 cursor-not-allowed";
            }

            return (
              <button
                key={value.id}
                type="button"
                disabled={disabled}
                data-option-id={option.id}
                data-option-value-id={value.id}
                data-selected={selected}
                data-status={status}
                onClick={() => onSelect(option.id, value.id)}
                className={`flex h-10 items-center gap-2.5 rounded border px-3 text-left text-sm font-medium transition ${stateClasses}`}
              >
                {displayType === "color" && (
                  <span
                    className="relative size-5 shrink-0 rounded-full border border-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                    style={{ backgroundColor: hex }}
                    aria-hidden="true"
                  >
                    {disabled && (
                      <span className="pointer-events-none absolute inset-0 m-auto h-[1.5px] w-full -rotate-45 rounded-full bg-text-muted/80" />
                    )}
                  </span>
                )}

                {displayType === "image" && (
                  <span
                    className="relative size-6 shrink-0 overflow-hidden rounded border border-black/10 bg-surface-subtle"
                    aria-hidden="true"
                  >
                    {value.swatchAssetUrl ? (
                      <img
                        src={value.swatchAssetUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-text-muted">
                        {label.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {disabled && (
                      <span className="pointer-events-none absolute inset-0 m-auto h-[1.5px] w-full -rotate-45 bg-text-muted/80" />
                    )}
                  </span>
                )}

                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  });
}

