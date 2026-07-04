import {
  Badge,
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";
import { X } from "lucide-react";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { buildVariantSignature } from "./use-create-product";
import { hasEmbeddedCustomizationDraft } from "../create-product-helpers";
import type { useCreateProduct } from "./use-create-product";

type CreateProductDetailsProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function CreateProductDetails({ state }: CreateProductDetailsProps) {
  const {
    values,
    setValue,
    errors,
    embeddedCustomization,
    attributes,
    addAttributeRow,
    updateAttribute,
    removeAttributeRow,
    optionDefinitions,
    addOptionDefinition,
    effectiveVariantRows,
    toggleAllVariants,
    toggleVariantCreation,
    setOptionDraftValue,
    optionValueDrafts,
    appendOptionValue,
    removeOptionValue,
    updateOptionDefinition,
    removeOptionDefinition,
  } = state;

  return (
    <div className="space-y-8 ">
      <div>
        <Heading level="h2">General</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Core product identity, handle, media, and merchandising copy.
        </Text>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="product-title">Title</Label>
          <Input
            id="product-title"
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder="Winter jacket"
          />
          {errors.title ? (
            <Text size="small" className="text-rose-700">
              {errors.title}
            </Text>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-subtitle">Subtitle</Label>
          <Input
            id="product-subtitle"
            value={values.subtitle}
            onChange={(event) => setValue("subtitle", event.target.value)}
            placeholder="Warm and cosy"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-handle">Handle</Label>
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
          {errors.handle ? (
            <Text size="small" className="text-rose-700">
              {errors.handle}
            </Text>
          ) : (
            <Text size="small" className="text-ui-fg-subtle">
              Leave blank to generate it from the title.
            </Text>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          value={values.description}
          onChange={(event) => setValue("description", event.target.value)}
          placeholder="A warm and cozy jacket"
        />
      </div>

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
          <Button type="button" variant="secondary" onClick={addAttributeRow}>
            Add attribute
          </Button>
        </div>
        <div className="space-y-3">
          {attributes.map((attribute, index) => (
            <div
              key={`${index}-${attribute.key}`}
              className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                value={attribute.key}
                onChange={(event) =>
                  updateAttribute(index, "key", event.target.value)
                }
                placeholder="Material"
              />
              <Input
                value={attribute.value}
                onChange={(event) =>
                  updateAttribute(index, "value", event.target.value)
                }
                placeholder="Cotton blend"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeAttributeRow(index)}
                disabled={attributes.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
          {errors.attributes ? (
            <InlineError message={errors.attributes} />
          ) : null}
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
            {optionDefinitions.map((option) => (
              <div
                key={option.id}
                className="rounded-xl border border-ui-border-base p-4"
              >
                <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)_32px]">
                  <div className="space-y-6 pt-2">
                    <Text weight="plus" size="small">
                      Title
                    </Text>
                    <Text weight="plus" size="small">
                      Values
                    </Text>
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={option.title}
                      onChange={(event) =>
                        updateOptionDefinition(option.id, event.target.value)
                      }
                      placeholder="Color"
                    />
                    <div className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 shadow-buttons-neutral">
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => (
                          <Badge key={value.id} size="xsmall" color="blue">
                            {value.value}
                            <button
                              type="button"
                              className="ml-1 inline-flex"
                              onClick={() =>
                                removeOptionValue(option.id, value.id)
                              }
                              aria-label={`Remove ${value.value}`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                        <input
                          value={optionValueDrafts[option.id] ?? ""}
                          onChange={(event) =>
                            setOptionDraftValue(option.id, event.target.value)
                          }
                          onBlur={() => appendOptionValue(option.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === ",") {
                              event.preventDefault();
                              appendOptionValue(option.id);
                            }
                          }}
                          className="min-w-[180px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ui-fg-muted"
                          placeholder={
                            option.values.length > 0
                              ? "Add another value"
                              : "Red, Blue, Green"
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => removeOptionDefinition(option.id)}
                      className="text-ui-fg-muted transition hover:text-ui-fg-base"
                      aria-label="Remove option"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {errors.optionDefinitions ? (
            <InlineError message={errors.optionDefinitions} />
          ) : null}

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
