import { useState } from "react";
import { Badge, Button, IconButton, Input, Select, Text } from "@medusajs/ui";
import { Plus, Trash2, X } from "lucide-react";
import { ColorSwatchPicker, ImageSwatchPicker } from "../../components/ui/option-swatch-picker";
import { LocalizedTextField, createLocalizedText, getMissingLocalizedTextLocales } from "../../components/ui/medusa";
import type { OptionDraft, AdminLocale } from "../../types";

export type ProductOptionEditorProps = {
  option: OptionDraft;
  onChange: (updatedOption: OptionDraft) => void;
  onRemove?: () => void;
  titleLocale: AdminLocale;
  onTitleLocaleChange: (locale: AdminLocale) => void;
  disabled?: boolean;
};

export function ProductOptionEditor({
  option,
  onChange,
  onRemove,
  titleLocale,
  onTitleLocaleChange,
  disabled,
}: ProductOptionEditorProps) {
  const [valueDraft, setValueDraft] = useState("");

  const updateDisplayType = (val: "text" | "color" | "image") => {
    onChange({ ...option, displayType: val });
  };

  const updateTitleTranslations = (translations: Record<AdminLocale, string>) => {
    onChange({
      ...option,
      titleTranslations: {
        ...option.titleTranslations,
        [titleLocale]: translations[titleLocale],
      },
    });
  };

  const addValue = (trimmedVal: string) => {
    if (!trimmedVal) return;
    if (!option.values.some((v) => v.valueTranslations.vi.toLowerCase() === trimmedVal.toLowerCase())) {
      onChange({
        ...option,
        values: [
          ...option.values,
          {
            id: null,
            valueTranslations: createLocalizedText(trimmedVal),
            colorHex: null,
            swatchAssetId: null,
            swatchAssetUrl: null,
          },
        ],
      });
    }
    setValueDraft("");
  };

  return (
    <div className="rounded-xl border border-ui-border-base p-4 space-y-4 bg-ui-bg-base">
      <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)_32px]">
        <div className="space-y-6 pt-2">
          <Text weight="plus" size="small">
            Title
          </Text>
          <Text weight="plus" size="small">
            Display
          </Text>
        </div>
        <div className="space-y-3">
          <LocalizedTextField
            id={`option-${option.id}-title`}
            value={option.titleTranslations}
            locale={titleLocale}
            onLocaleChange={onTitleLocaleChange}
            onChange={updateTitleTranslations}
            placeholder={{
              vi: "Màu sắc",
              en: "Color",
            }}
            requiredLocales={["vi"]}
            disabled={disabled}
          />

          <div className="flex items-center gap-3">
            <Select
              size="small"
              value={option.displayType}
              onValueChange={(val) => updateDisplayType(val as "text" | "color" | "image")}
              disabled={disabled}
            >
              <Select.Trigger className="w-56">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="text">Text button (Default)</Select.Item>
                <Select.Item value="color">Color swatch (Màu sắc)</Select.Item>
                <Select.Item value="image">Image swatch (Mẫu vân / Icon)</Select.Item>
              </Select.Content>
            </Select>
            <Text size="xsmall" className="text-ui-fg-muted">
              {option.displayType === "color"
                ? "Each value has a color picker (HEX swatch)"
                : option.displayType === "image"
                ? "Each value has a small texture / icon upload"
                : "Standard text badge"}
            </Text>
          </div>
        </div>
        {onRemove ? (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onRemove}
              className="text-ui-fg-muted transition hover:text-ui-fg-base disabled:opacity-50"
              aria-label="Remove option"
              disabled={disabled}
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)_32px] pt-1 border-t border-ui-border-base/50">
        <div className="pt-2">
          <Text weight="plus" size="small">
            Values
          </Text>
        </div>
        <div className="space-y-2.5">
          {option.displayType === "text" ? (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2">
              <div className="flex flex-wrap gap-2 items-center">
                {option.values.map((v, index) => {
                  const missingLocales = getMissingLocalizedTextLocales(v.valueTranslations);
                  return (
                    <Badge
                      key={v.id ?? index}
                      size="xsmall"
                      color={missingLocales.length > 0 ? "orange" : "blue"}
                      className="gap-x-1.5 py-1"
                    >
                      <input
                        value={v.valueTranslations.vi}
                        onChange={(event) => {
                          const next = [...option.values];
                          next[index] = {
                            ...next[index],
                            valueTranslations: {
                              ...next[index].valueTranslations,
                              vi: event.target.value,
                            },
                          };
                          onChange({ ...option, values: next });
                        }}
                        className="min-w-[2ch] max-w-[16ch] bg-transparent text-xs outline-none placeholder:text-ui-fg-muted"
                        style={{ width: `${Math.max(v.valueTranslations.vi.length, 2)}ch` }}
                        placeholder="__"
                        aria-label="Vietnamese option value"
                        disabled={disabled}
                      />
                      <span className="text-ui-fg-muted">/</span>
                      <input
                        value={v.valueTranslations.en}
                        onChange={(event) => {
                          const next = [...option.values];
                          next[index] = {
                            ...next[index],
                            valueTranslations: {
                              ...next[index].valueTranslations,
                              en: event.target.value,
                            },
                          };
                          onChange({ ...option, values: next });
                        }}
                        className="min-w-[2ch] max-w-[16ch] bg-transparent text-xs outline-none placeholder:text-ui-fg-muted"
                        style={{ width: `${Math.max(v.valueTranslations.en.length, 2)}ch` }}
                        placeholder="__"
                        aria-label="English option value"
                        disabled={disabled}
                      />
                      <button
                        type="button"
                        className="inline-flex hover:text-ui-fg-base text-ui-fg-muted focus:outline-none disabled:opacity-50"
                        disabled={disabled}
                        onClick={() => {
                          const next = option.values.filter((_, i) => i !== index);
                          onChange({ ...option, values: next });
                        }}
                        aria-label="Remove option value"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
                <input
                  value={valueDraft}
                  disabled={disabled}
                  onChange={(event) => setValueDraft(event.target.value)}
                  onBlur={() => {
                    addValue(valueDraft.trim());
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addValue(valueDraft.trim());
                    } else if (event.key === "Backspace" && !valueDraft && option.values.length > 0) {
                      const next = option.values.slice(0, -1);
                      onChange({ ...option, values: next });
                    }
                  }}
                  className="min-w-[120px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ui-fg-muted focus:ring-0 disabled:opacity-50"
                  placeholder={option.values.length > 0 ? "Add another value..." : "e.g. Red, Blue, Green"}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {option.values.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted italic py-1">
                  No values added yet. Click &quot;Add value&quot; below.
                </Text>
              ) : (
                <div className="space-y-1.5">
                  {option.values.map((v, index) => (
                    <div
                      key={v.id ?? index}
                      className="flex items-center gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2"
                    >
                      {option.displayType === "color" ? (
                        <ColorSwatchPicker
                          colorHex={v.colorHex ?? null}
                          onChange={(hex) => {
                            const next = [...option.values];
                            next[index] = { ...next[index], colorHex: hex };
                            onChange({ ...option, values: next });
                          }}
                        />
                      ) : (
                        <ImageSwatchPicker
                          swatchAssetUrl={v.swatchAssetUrl ?? null}
                          onChange={(swatch) => {
                            const next = [...option.values];
                            next[index] = {
                              ...next[index],
                              swatchAssetId: swatch.swatchAssetId,
                              swatchAssetUrl: swatch.swatchAssetUrl,
                            };
                            onChange({ ...option, values: next });
                          }}
                        />
                      )}
                      <div className="grid grid-cols-2 flex-1 gap-2">
                        <Input
                          size="small"
                          value={v.valueTranslations.vi}
                          onChange={(e) => {
                            const next = [...option.values];
                            next[index] = {
                              ...next[index],
                              valueTranslations: {
                                ...next[index].valueTranslations,
                                vi: e.target.value,
                              },
                            };
                            onChange({ ...option, values: next });
                          }}
                          placeholder="Tên giá trị (VI)"
                          disabled={disabled}
                        />
                        <Input
                          size="small"
                          value={v.valueTranslations.en}
                          onChange={(e) => {
                            const next = [...option.values];
                            next[index] = {
                              ...next[index],
                              valueTranslations: {
                                ...next[index].valueTranslations,
                                en: e.target.value,
                              },
                            };
                            onChange({ ...option, values: next });
                          }}
                          placeholder="Value name (EN)"
                          disabled={disabled}
                        />
                      </div>
                      <IconButton
                        type="button"
                        variant="transparent"
                        size="small"
                        disabled={disabled}
                        onClick={() => {
                          const next = option.values.filter((_, i) => i !== index);
                          onChange({ ...option, values: next });
                        }}
                        aria-label="Remove value"
                      >
                        <Trash2 className="size-4 text-ui-fg-muted hover:text-ui-fg-error" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    ...option,
                    values: [
                      ...option.values,
                      {
                        id: null,
                        valueTranslations: createLocalizedText(""),
                        colorHex: null,
                        swatchAssetId: null,
                        swatchAssetUrl: null,
                      },
                    ],
                  });
                }}
              >
                <Plus className="size-3.5 mr-1" />
                Add value
              </Button>
            </div>
          )}
        </div>
        <div />
      </div>
    </div>
  );
}
