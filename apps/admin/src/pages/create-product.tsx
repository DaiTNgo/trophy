import { Button, FocusModal, ProgressTabs, Text } from "@medusajs/ui";
import { useNavigate } from "react-router";
import { slugify } from "../lib/utils";
import { ProductsListPage } from "./products-list";
import { InlineError } from "../components/ui/medusa/inline-error";

import { useCreateProduct, type CreateProductStep } from "./create-product/use-create-product";
import { CreateProductDetails } from "./create-product/create-product-details";
import { CreateProductOrganize } from "./create-product/create-product-organize";
import { CreateProductVariants } from "./create-product/create-product-variants";
import { CreateProductCustomization } from "./create-product/create-product-customization";
import { VariantGallery } from "./create-product/variant-gallery";

export function CreateProductPage() {
  const navigate = useNavigate();
  const state = useCreateProduct();
  
  const {
    activeStep,
    goToStep,
    stepOrder,
    activeStepIndex,
    errors,
    values,
    effectiveVariantRows,
    publishReady,
    isSubmittingMedia,
    isLastStep,
    submit,
    continueToNextStep,
    variantGallery,
  } = state;

  return (
    <>
      <ProductsListPage />
      <FocusModal
        open
        onOpenChange={(open) => {
          if (!open && !variantGallery) {
            navigate("/products");
          }
        }}
      >
        <FocusModal.Content className="md:inset-2">
          <ProgressTabs
            value={activeStep}
            onValueChange={(value) => goToStep(value as CreateProductStep)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <FocusModal.Header>
              <ProgressTabs.List className="-my-2 w-full border-l">
                {stepOrder.map((step) => {
                  const stepLabel =
                    step === "details"
                      ? "Details"
                      : step === "organize"
                        ? "Organize"
                        : step === "variants"
                          ? "Variants"
                          : "Customization";
                  const status =
                    stepOrder.indexOf(step) < activeStepIndex
                      ? "completed"
                      : step === activeStep
                        ? "in-progress"
                        : "not-started";
                  return (
                    <ProgressTabs.Trigger
                      key={step}
                      value={step}
                      status={status}
                    >
                      {stepLabel}
                    </ProgressTabs.Trigger>
                  );
                })}
              </ProgressTabs.List>
            </FocusModal.Header>

            <FocusModal.Body className="overflow-y-auto flex flex-col">
              <div className="flex-1 flex flex-col min-h-0">
                {errors.form ? <InlineError message={errors.form} /> : null}
                {errors.publish ? (
                  <InlineError message={errors.publish} />
                ) : null}

                <ProgressTabs.Content
                  value="details"
                  className="outline-none px-6 py-6"
                >
                  <CreateProductDetails state={state} />
                </ProgressTabs.Content>

                <ProgressTabs.Content
                  value="organize"
                  className="outline-none px-6 py-6"
                >
                  <CreateProductOrganize state={state} />
                </ProgressTabs.Content>

                <ProgressTabs.Content value="variants" className="space-y-5">
                  <CreateProductVariants state={state} />
                </ProgressTabs.Content>

                {values.customizationEnabled ? (
                  <ProgressTabs.Content
                    value="customization"
                    className="outline-none px-6 py-6 flex-1 flex flex-col min-h-0"
                  >
                    <CreateProductCustomization state={state} />
                  </ProgressTabs.Content>
                ) : null}
              </div>
            </FocusModal.Body>
          </ProgressTabs>

          <FocusModal.Footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-4">
              <Text size="small" className="text-ui-fg-subtle">
                Handle:{" "}
                <span className="text-ui-fg-base">
                  {values.handle.trim() ||
                    slugify(values.title || "new-product")}
                </span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Variants:{" "}
                <span className="text-ui-fg-base">
                  {String(effectiveVariantRows.length)}
                </span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Publish:{" "}
                <span className="text-ui-fg-base">
                  {publishReady.ready ? "Ready" : "Needs review"}
                </span>
              </Text>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingMedia}
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingMedia}
                onClick={() => submit("draft")}
              >
                {isSubmittingMedia ? "Uploading media..." : "Save as draft"}
              </Button>
              <Button
                type="button"
                disabled={isSubmittingMedia}
                onClick={
                  isLastStep ? () => submit("publish") : continueToNextStep
                }
              >
                {isSubmittingMedia
                  ? "Uploading media..."
                  : isLastStep
                    ? "Publish"
                    : "Continue"}
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

      <VariantGallery state={state} />

      <datalist id="product-tag-suggestions">
        {state.metadata.tags.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
