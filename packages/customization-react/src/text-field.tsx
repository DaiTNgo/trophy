import {
  getFontStyleCapabilities,
  getUsableFontOptions,
  normalizeFontStyle,
  resolveFontVariant,
  resolveFormat,
  resolveLocalizedInput,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationLayer,
  type DynamicFontFamily,
  type TextFieldValue,
} from "@trophy/customization";
import { useEffect } from "react";
import { Plus } from "lucide-react";

export function TextField({
  field,
  layer,
  value,
  dynamicFonts = [],
  locale,
  onChange,
}: {
  field: CustomizationFormField;
  layer: Extract<CustomizationLayer, { type: "text" }>;
  value: CustomizationFieldValue | undefined;
  dynamicFonts?: DynamicFontFamily[];
  locale?: string;
  onChange: (value: TextFieldValue) => void;
}) {
  const textValue = value && "text" in value ? value : { text: "" };
  const pathText = layer.text.path.type !== "straight";
  const fontPolicy = layer.text.fontPolicy;
  const availableFontOptions =
    fontPolicy.mode === "shopper_selectable"
      ? getUsableFontOptions(fontPolicy.options, dynamicFonts)
      : [];
  const selectedFontId =
    fontPolicy.mode === "shopper_selectable"
      ? (availableFontOptions.find(
          (option) => option.value === textValue.fontId,
        )?.value ??
        availableFontOptions[0]?.value ??
        "")
      : fontPolicy.fontId;
  const selectedFontCapabilities = getFontStyleCapabilities(
    selectedFontId,
    dynamicFonts,
  );
  const requestedFormat = resolveFormat(layer.text.formatPolicy, textValue);
  const normalizedStyle = normalizeFontStyle({
    fontFamily: selectedFontId,
    isBold: requestedFormat.isBold,
    isItalic: requestedFormat.isItalic,
    dynamicFonts,
  });

  useEffect(() => {
    if (
      textValue.fontId === selectedFontId &&
      textValue.isBold === normalizedStyle.isBold &&
      textValue.isItalic === normalizedStyle.isItalic
    ) {
      return;
    }
    onChange({ ...textValue, fontId: selectedFontId, ...normalizedStyle });
  }, [
    normalizedStyle.isBold,
    normalizedStyle.isItalic,
    onChange,
    selectedFontId,
    textValue,
  ]);

  const isMultiLine = !pathText && (layer.text.maxLines ?? 1) > 1;
  const maxLines = Math.max(1, Math.round(layer.text.maxLines ?? 1));

  return (
    <div className="space-y-4">
      <style>{`
        .trophy-customization-text-input::selection {
          color: #ffffff;
          background-color: #288ab6;
        }
        .trophy-customization-text-input::-moz-selection {
          color: #ffffff;
          background-color: #288ab6;
        }
      `}</style>
      {isMultiLine ? (
        <div className="space-y-1.5">
          <textarea
            rows={Math.min(Math.max(2, maxLines), 5)}
            value={textValue.text}
            placeholder={
              resolveLocalizedInput(field.placeholder, locale) ||
              "Letter limit varies, refer to preview to confirm your text is correct"
            }
            onChange={(event) => {
              const lines = event.target.value
                .replace(/\r/g, "")
                .split("\n")
                .slice(0, maxLines);
              onChange({
                ...textValue,
                text: lines.join("\n"),
              });
            }}
            className="trophy-customization-text-input w-full resize-none rounded border border-outline bg-white px-3 py-2 text-sm text-on-surface outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-xs text-on-surface-variant/70">
            {locale === "vi"
              ? `Tối đa ${maxLines} dòng`
              : `Maximum ${maxLines} lines`}
          </p>
        </div>
      ) : (
        <input
          type="text"
          value={pathText ? textValue.text : textValue.text.replace(/\n/g, " ")}
          placeholder={
            resolveLocalizedInput(field.placeholder, locale) ||
            "Letter limit varies, refer to preview to confirm your text is correct"
          }
          onChange={(event) =>
            onChange({
              ...textValue,
              text: event.target.value,
            })
          }
          className="trophy-customization-text-input h-10 w-full rounded border border-outline bg-white px-3 text-sm text-on-surface outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      )}
      {layer.text.colorPolicy.mode === "shopper_selectable"
        ? (() => {
            const colorPolicy = layer.text.colorPolicy;
            const activeColor = textValue.color ?? colorPolicy.defaultColor;
            const isPreset = colorPolicy.options.some(
              (option) =>
                option.value.toLowerCase() === activeColor?.toLowerCase(),
            );
            const inputHexValue = (() => {
              if (activeColor && /^#[0-9a-fA-F]{6}$/.test(activeColor)) {
                return activeColor;
              }
              if (activeColor && /^#[0-9a-fA-F]{3}$/.test(activeColor)) {
                return `#${activeColor[1]}${activeColor[1]}${activeColor[2]}${activeColor[2]}${activeColor[3]}${activeColor[3]}`;
              }
              return "#000000";
            })();
            const customColorTitle = resolveLocalizedInput(
              { en: "Custom color", vi: "Màu tùy chỉnh" },
              locale,
            );

            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                  Text Color
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {colorPolicy.options.map((option) => {
                    const selected =
                      isPreset &&
                      activeColor?.toLowerCase() === option.value.toLowerCase();
                    const optionLabel = resolveLocalizedInput(
                      option.label,
                      locale,
                    );
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={optionLabel}
                        onClick={() =>
                          onChange({ ...textValue, color: option.value })
                        }
                        className={`size-8 rounded-full border-2 transition ${
                          selected
                            ? "border-accent ring-2 ring-accent/40 ring-offset-1"
                            : "border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.18)] hover:ring-2 hover:ring-accent/30"
                        }`}
                        style={{ backgroundColor: option.value }}
                      />
                    );
                  })}
                  {colorPolicy.allowCustomColor ? (
                    <div className="relative inline-flex items-center">
                      <label
                        title={customColorTitle}
                        aria-label={customColorTitle}
                        className={`group relative flex size-8 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                          !isPreset
                            ? "border-accent ring-2 ring-accent/40 ring-offset-1"
                            : "border-dashed border-outline-variant bg-surface-container hover:border-accent hover:ring-2 hover:ring-accent/30"
                        }`}
                        style={{
                          backgroundColor: !isPreset ? activeColor : undefined,
                        }}
                      >
                        <input
                          type="color"
                          value={inputHexValue}
                          onChange={(event) =>
                            onChange({
                              ...textValue,
                              color: event.target.value,
                            })
                          }
                          className="absolute inset-0 size-full cursor-pointer opacity-0"
                          aria-label={customColorTitle}
                        />
                        {isPreset ? (
                          <Plus className="size-3.5 text-on-surface-variant transition group-hover:text-on-surface" />
                        ) : null}
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()
        : null}
      {fontPolicy.mode === "shopper_selectable" &&
      availableFontOptions.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Font
          </p>
          <div className="flex flex-wrap gap-2">
            {availableFontOptions.map((option) => {
              const selected = selectedFontId === option.value;
              const optionLabel = resolveLocalizedInput(option.label, locale);
              return (
                <button
                  key={option.value}
                  type="button"
                  title={optionLabel}
                  onClick={() => {
                    const nextStyle = normalizeFontStyle({
                      fontFamily: option.value,
                      isBold: normalizedStyle.isBold,
                      isItalic: normalizedStyle.isItalic,
                      dynamicFonts,
                    });
                    onChange({
                      ...textValue,
                      fontId: option.value,
                      ...nextStyle,
                    });
                  }}
                  className={`flex h-9 items-center justify-center rounded border px-3 text-sm transition ${
                    selected
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-outline bg-white text-on-surface hover:border-accent"
                  }`}
                  style={{
                    fontFamily: resolveFontVariant(
                      option.value,
                      false,
                      false,
                      dynamicFonts,
                    ),
                  }}
                >
                  {optionLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {layer.text.formatPolicy.mode === "shopper_selectable" &&
      (selectedFontCapabilities.bold || selectedFontCapabilities.italic) ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Format
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFontCapabilities.bold ? (
              <button
                type="button"
                aria-pressed={normalizedStyle.isBold}
                onClick={() => {
                  const nextBold = !normalizedStyle.isBold;
                  const nextStyle = normalizeFontStyle({
                    fontFamily: selectedFontId,
                    isBold: nextBold,
                    isItalic: normalizedStyle.isItalic,
                    dynamicFonts,
                  });
                  onChange({
                    ...textValue,
                    fontId: selectedFontId,
                    ...nextStyle,
                  });
                }}
                className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-bold transition ${
                  normalizedStyle.isBold
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-white text-on-surface hover:border-accent"
                }`}
              >
                B
              </button>
            ) : null}
            {selectedFontCapabilities.italic ? (
              <button
                type="button"
                aria-pressed={normalizedStyle.isItalic}
                onClick={() => {
                  const nextItalic = !normalizedStyle.isItalic;
                  const nextStyle = normalizeFontStyle({
                    fontFamily: selectedFontId,
                    isBold: normalizedStyle.isBold,
                    isItalic: nextItalic,
                    dynamicFonts,
                  });
                  onChange({
                    ...textValue,
                    fontId: selectedFontId,
                    ...nextStyle,
                  });
                }}
                className={`flex h-9 w-9 items-center justify-center rounded border text-sm italic transition ${
                  normalizedStyle.isItalic
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-white text-on-surface hover:border-accent"
                }`}
              >
                I
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

