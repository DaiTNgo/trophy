import { memo, useState } from "react";
import {
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Switch,
  Text,
} from "@medusajs/ui";
import {
  LocalizedTextField,
  createLocalizedText,
} from "../../components/ui/medusa";
import { RichTextEditor, type RichTextValueByLocale } from "../../components/rich-text/rich-text-editor";
import { buildVariantSignature } from "./use-create-product";
import { hasEmbeddedCustomizationDraft } from "../create-product-helpers";
import { ProductAttributesEditor } from "../../components/products/product-attributes-editor";
import { ProductOptionEditor } from "../../components/product/ProductOptionEditor";
import type {
  AdminLocale,
  LocalizedTextValue,
  ProductOptionValueDefinition,
  OptionDraft,
} from "../../types";
import type { useCreateProduct } from "./use-create-product";

type CreateProductDetailsProps = {
  state: ReturnType<typeof useCreateProduct>;
};

import { RICH_TEXT_SECTIONS, type RichTextSectionKey } from "../../lib/product-utils";

const EMPTY_RICH_TEXT: RichTextValueByLocale = {
  vi: { html: "", json: null },
  en: { html: "", json: null },
};

const ProductGeneralEditor = memo(function ProductGeneralEditor({
  values,
  setValue,
}: {
  values: {
    title: LocalizedTextValue;
    subtitle: LocalizedTextValue;
    handle: string;
    description: LocalizedTextValue;
  };
  setValue: <K extends "title" | "subtitle" | "handle" | "description">(
    field: K,
    value: any,
  ) => void;
}) {
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [subtitleLocale, setSubtitleLocale] = useState<AdminLocale>("vi");
  const [descriptionLocale, setDescriptionLocale] = useState<AdminLocale>("vi");

  return (
    <>
      <div>
        <Heading level="h2">General</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Core product identity, handle, media, and merchandising copy.
        </Text>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="product-title">Title</Label>
          <LocalizedTextField
            id="product-title"
            value={values.title}
            locale={titleLocale}
            onLocaleChange={setTitleLocale}
            onChange={(value) => setValue("title", value)}
            placeholder={{ vi: "Ao khoac mua dong", en: "Winter jacket" }}
            requiredLocales={["vi"]}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="product-subtitle"
            className="flex items-center gap-x-1"
          >
            Subtitle
            <Text as="span" size="small" className="text-ui-fg-muted">
              (Optional)
            </Text>
          </Label>
          <LocalizedTextField
            id="product-subtitle"
            value={values.subtitle}
            locale={subtitleLocale}
            onLocaleChange={setSubtitleLocale}
            onChange={(value) => setValue("subtitle", value)}
            placeholder={{ vi: "Am ap va de chiu", en: "Warm and cosy" }}
            requiredLocales={[]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-handle" className="flex items-center gap-x-1">
            Handle
            <Text as="span" size="small" className="text-ui-fg-muted">
              (Optional)
            </Text>
          </Label>
          <div className="flex items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
            <Text size="small" className="px-1 text-ui-fg-muted">
              /
            </Text>
            <Input
              id="product-handle"
              value={values.handle}
              onChange={(event) => setValue("handle", event.target.value)}
              className="border-0 bg-transparent shadow-none"
              placeholder="winter-jacket"
            />
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            Leave blank to generate it from the title.
          </Text>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="product-description"
          className="flex items-center gap-x-1"
        >
          Description
          <Text as="span" size="small" className="text-ui-fg-muted">
            (Optional)
          </Text>
        </Label>
        <LocalizedTextField
          id="product-description"
          value={values.description}
          locale={descriptionLocale}
          onLocaleChange={setDescriptionLocale}
          onChange={(value) => setValue("description", value)}
          placeholder={{
            vi: "Một chiếc áo ấm áp",
            en: "A warm and cozy jacket",
          }}
          requiredLocales={[]}
          multiline
        />
      </div>
    </>
  );
});

export function CreateProductDetails({ state }: CreateProductDetailsProps) {
  const [optionTitleLocales, setOptionTitleLocales] = useState<
    Record<string, AdminLocale>
  >({});
  const [attributeLocale, setAttributeLocale] = useState<AdminLocale>("vi");
  const [sectionEditors, setSectionEditors] = useState<
    Record<RichTextSectionKey, RichTextValueByLocale>
  >({
    whyThisProductHtml: EMPTY_RICH_TEXT,
    specificationsHtml: EMPTY_RICH_TEXT,
    shippingHtml: EMPTY_RICH_TEXT,
  });

  const {
    values,
    setValue,
    embeddedCustomization,
    attributes,
    optionDefinitions,
    addOptionDefinition,
    effectiveVariantRows,
    toggleAllVariants,
    toggleVariantCreation,
    removeOptionDefinition,
    updateOptionFromDraft,
  } = state;

  function getOptionTitleLocale(optionId: string) {
    return optionTitleLocales[optionId] ?? "vi";
  }

  function setOptionTitleLocale(optionId: string, locale: AdminLocale) {
    setOptionTitleLocales((current) => ({ ...current, [optionId]: locale }));
  }

  function getOptionValueTranslations(
    value: ProductOptionValueDefinition,
  ): LocalizedTextValue {
    return value.valueTranslations ?? createLocalizedText(value.value);
  }

  function handleSectionChange(
    key: RichTextSectionKey,
    locale: AdminLocale,
    value: RichTextValueByLocale[AdminLocale],
  ) {
    setSectionEditors((current) => ({
      ...current,
      [key]: { ...current[key], [locale]: value },
    }));
    setValue(key, {
      vi: locale === "vi" ? value.html : sectionEditors[key].vi.html,
      en: locale === "en" ? value.html : sectionEditors[key].en.html,
    });
  }

  return (
    <div className="space-y-8 ">
      <ProductGeneralEditor values={values} setValue={setValue} />

      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Heading level="h3">Customization</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Enable this when shoppers should personalize the product after
              choosing a variant.
            </Text>
          </div>
          <Switch
            checked={values.customizationEnabled}
            onCheckedChange={(checked) =>
              setValue("customizationEnabled", checked)
            }
          />
        </div>
        <Text size="small" className="mt-3 text-ui-fg-subtle">
          When enabled, a <span className="text-ui-fg-base">Customization</span>{" "}
          tab appears after <span className="text-ui-fg-base">Variants</span>.
        </Text>
        {!values.customizationEnabled &&
        hasEmbeddedCustomizationDraft(embeddedCustomization) ? (
          <Text size="small" className="mt-2 text-ui-fg-subtle">
            Your in-progress customization draft is still kept for this create
            session and will be reused if you turn customization back on.
          </Text>
        ) : null}
      </div>

      <div className="space-y-4 border-t border-ui-border-base pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h2">Attributes</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              Optional product properties that do not affect variant generation.
            </Text>
          </div>
        </div>
        <div className="space-y-3 mt-3">
          <ProductAttributesEditor
            attributes={attributes}
            onChange={state.setAttributes}
            locale={attributeLocale}
            onLocaleChange={setAttributeLocale}
            disableRemoveIfOne={true}
          />
        </div>
      </div>

      <div className="space-y-6 border-t border-ui-border-base pt-4">
        <div>
          <Heading level="h2">Product sections</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Rich-text content for the product detail page accordions. Optional.
          </Text>
        </div>
        <div className="space-y-5">
          {RICH_TEXT_SECTIONS.map((section) => (
            <div key={section.key} className="space-y-2">
              <div>
                <Label size="small" weight="plus">{section.label}</Label>
                {section.description ? (
                  <Text size="xsmall" className="mt-0.5 text-ui-fg-muted">{section.description}</Text>
                ) : null}
              </div>
              <RichTextEditor
                key={section.key}
                label={section.label}
                valueByLocale={sectionEditors[section.key]}
                onChangeByLocale={(locale, value) =>
                  handleSectionChange(section.key, locale, value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Heading level="h2">Variants</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Manage variant options and pricing.
        </Text>
      </div>

      <div className="rounded-lg border border-ui-border-base px-4 py-4">
        <div className="flex items-start gap-4">
          <Switch
            checked={values.hasVariants}
            onCheckedChange={(checked) => {
              setValue("hasVariants", checked);
              if (checked && optionDefinitions.length === 0) {
                addOptionDefinition();
              }
            }}
          />
          <div>
            <Heading level="h3">Yes, this is a product with variants</Heading>
            <Text className="mt-1 text-ui-fg-subtle">
              When unchecked, we will create a default variant for you
            </Text>
          </div>
        </div>
      </div>

      {values.hasVariants ? (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Heading level="h3">Product options</Heading>
              <Text size="small" className="mt-1 text-ui-fg-subtle">
                Define the options for the product, e.g. color, size, etc.
              </Text>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={addOptionDefinition}
            >
              Add
            </Button>
          </div>

          {optionDefinitions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ui-border-base px-4 py-5">
              <Text size="small" className="text-ui-fg-subtle">
                Add your first product option to start generating variant rows.
              </Text>
            </div>
          ) : null}

          <div className="space-y-4">
            {optionDefinitions.map((option) => {
              const optionTitleLocale = getOptionTitleLocale(option.id);
              const optionDraft: OptionDraft = {
                id: option.id,
                titleTranslations: option.titleTranslations ?? createLocalizedText(option.title),
                displayType: option.displayType ?? "text",
                values: option.values.map(v => ({
                  id: v.id,
                  valueTranslations: getOptionValueTranslations(v),
                  colorHex: v.colorHex,
                  swatchAssetId: v.swatchAssetId,
                  swatchAssetUrl: v.swatchAssetUrl,
                }))
              };

              return (
                <ProductOptionEditor
                  key={option.id}
                  option={optionDraft}
                  titleLocale={optionTitleLocale}
                  onTitleLocaleChange={(locale) => setOptionTitleLocale(option.id, locale)}
                  onRemove={() => removeOptionDefinition(option.id)}
                  onChange={updateOptionFromDraft}
                />
              );
            })}
          </div>

          <div>
            <Heading level="h3">Product variants</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              Select the variant combinations to create.
            </Text>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div
              className="bg-ui-bg-component text-ui-fg-subtle grid items-center gap-3 border-b px-6 py-2.5"
              style={{ gridTemplateColumns: "20px 1fr" }}
            >
              <Checkbox
                checked={
                  effectiveVariantRows.length > 0 &&
                  effectiveVariantRows.every((v) => v.shouldCreate)
                }
                onCheckedChange={(checked) =>
                  toggleAllVariants(checked === true)
                }
              />
              <Text size="small" weight="plus">
                Title / SKU
              </Text>
            </div>

            <div>
              {effectiveVariantRows.length === 0 ? (
                <div className="px-6 py-5">
                  <Text size="small" className="text-ui-fg-subtle">
                    Add at least one option with values to generate variants.
                  </Text>
                </div>
              ) : (
                effectiveVariantRows.map((variant, index) => (
                  <div
                    key={buildVariantSignature(variant.options)}
                    className="grid items-center gap-3 border-b border-ui-border-base px-6 py-2.5 last:border-b-0"
                    style={{
                      gridTemplateColumns: "20px 1fr",
                    }}
                  >
                    <Checkbox
                      checked={variant.shouldCreate}
                      onCheckedChange={() => toggleVariantCreation(index)}
                    />
                    <div className="min-w-0">
                      <Text size="small" weight="plus">
                        {variant.title}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {variant.options.length > 0
                          ? variant.options
                              .map(
                                (option) => `${option.option}: ${option.value}`,
                              )
                              .join(" • ")
                          : "Default variant"}
                      </Text>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-ui-bg-component txt-small text-ui-fg-subtle grid grid-cols-[4px_1fr] items-start gap-3 rounded-lg border p-3">
            <div
              role="presentation"
              className="bg-ui-tag-neutral-icon h-full w-1 rounded-full"
            />
            <div className="text-pretty">
              <strong className="txt-small-plus text-ui-fg-base">Tip:</strong>{" "}
              Variants left unchecked won't be created. You can always create
              and edit variants afterwards but this list fits the variations in
              your product options.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
