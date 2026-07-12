import { Label, Text, Textarea } from "@medusajs/ui";
import { cn } from "../../../lib/utils";
import type { AdminLocale, LocalizedTextValue } from "../../../types";

const LOCALE_OPTIONS: Array<{ value: AdminLocale; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];
const ALL_LOCALES = LOCALE_OPTIONS.map((locale) => locale.value);

const localeNames: Record<AdminLocale, string> = {
  vi: "Vietnamese",
  en: "English",
};

export function createEmptyLocalizedText(): LocalizedTextValue {
  return {
    vi: "",
    en: "",
  };
}

export function createLocalizedText(value = ""): LocalizedTextValue {
  return {
    vi: value,
    en: "",
  };
}

export function getMissingLocalizedTextLocales(
  value: LocalizedTextValue,
  requiredLocales: readonly AdminLocale[] = [],
) {
  return requiredLocales.filter((locale) => !value[locale].trim());
}

type LanguageSwitchProps = {
  value: AdminLocale;
  onValueChange: (value: AdminLocale) => void;
  missingLocales?: AdminLocale[];
  size?: "default" | "compact";
  className?: string;
};

export function LanguageSwitch({
  value,
  onValueChange,
  missingLocales = [],
  size = "default",
  className,
}: LanguageSwitchProps) {
  return (
    <div className={cn("flex items-center rounded-md border border-ui-border-base bg-ui-bg-subtle p-0.5", className)}>
      {LOCALE_OPTIONS.map((locale) => {
        const isActive = value === locale.value;
        const isMissing = missingLocales.includes(locale.value);

        return (
          <button
            key={locale.value}
            type="button"
            onClick={() => onValueChange(locale.value)}
            className={cn(
              "relative rounded-[4px] text-xs font-medium text-ui-fg-subtle transition-colors",
              "hover:text-ui-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive",
              size === "compact" ? "min-w-7 px-1.5 py-0.5" : "min-w-9 px-2 py-1",
              isMissing && "text-ui-tag-orange-text underline decoration-ui-tag-orange-icon underline-offset-2",
              isActive && "bg-ui-bg-base text-ui-fg-base shadow-borders-base",
              isActive && isMissing && "text-ui-tag-orange-text",
            )}
            aria-pressed={isActive}
            aria-label={`${localeNames[locale.value]}${isMissing ? " translation missing" : ""}`}
          >
            {locale.label}
          </button>
        );
      })}
    </div>
  );
}

type LocalizedTextFieldProps = {
  id: string;
  label?: string;
  value: LocalizedTextValue;
  locale: AdminLocale;
  onLocaleChange: (locale: AdminLocale) => void;
  onChange: (value: LocalizedTextValue) => void;
  placeholder?: Partial<Record<AdminLocale, string>>;
  helperText?: string;
  requiredLocales?: readonly AdminLocale[];
  multiline?: boolean;
  rows?: number;
  className?: string;
};

export function LocalizedTextField({
  id,
  label,
  value,
  locale,
  onLocaleChange,
  onChange,
  placeholder,
  helperText,
  requiredLocales,
  multiline = false,
  rows = 4,
  className,
}: LocalizedTextFieldProps) {
  const missingLocales = getMissingLocalizedTextLocales(value, requiredLocales);
  const fieldId = `${id}-${locale}`;

  const handleValueChange = (nextValue: string) => {
    onChange({
      ...value,
      [locale]: nextValue,
    });
  };

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      {label ? (
        <div className="flex items-center gap-x-2">
          <Label htmlFor={fieldId} weight="plus">
            {label}
          </Label>
        </div>
      ) : null}

      {multiline ? (
        <div className="relative">
          <Textarea
            id={fieldId}
            value={value[locale]}
            onChange={(event) => handleValueChange(event.target.value)}
            placeholder={placeholder?.[locale]}
            rows={rows}
            className="pr-24"
          />
          <LanguageSwitch
            value={locale}
            onValueChange={onLocaleChange}
            missingLocales={missingLocales}
            size="compact"
            className="absolute right-2 top-2"
          />
        </div>
      ) : (
        <div className="flex items-center overflow-hidden rounded-md bg-ui-bg-field shadow-borders-base">
          <input
            id={fieldId}
            value={value[locale]}
            onChange={(event) => handleValueChange(event.target.value)}
            placeholder={placeholder?.[locale]}
            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-ui-fg-muted"
          />
          <div className="flex h-full items-center border-l border-ui-border-base px-1">
            <LanguageSwitch
              value={locale}
              onValueChange={onLocaleChange}
              missingLocales={missingLocales}
              size="compact"
              className="border-0 bg-transparent"
            />
          </div>
        </div>
      )}

      {helperText ? (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {helperText}
        </Text>
      ) : null}
    </div>
  );
}
