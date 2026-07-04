import {
  buildDesignFromForm,
  validateCustomizationValues,
  validateProductCustomizationDraft,
  validateTemplateForPublish,
  type CustomizationDesign,
  type ProductCustomization,
  type CustomizationTemplate,
} from "@trophy/customization";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import {
  customizationDesignRevisions,
  customizationDesigns,
  customizationTemplateRevisions,
  customizationTemplates,
} from "../../../db/schema";

export type StoredEditorModel = Pick<CustomizationTemplate, "background" | "layers" | "formFields">;
export type StoredProductCustomizationModel = Pick<
  ProductCustomization,
  "canvasWidthPx" | "canvasHeightPx" | "layers" | "formFields"
>;

export const serializeEditorModel = (template: Pick<CustomizationTemplate, "background" | "layers" | "formFields">) =>
  JSON.stringify({
    background: template.background,
    layers: template.layers,
    formFields: template.formFields,
  } satisfies StoredEditorModel);

export const parseStoredEditorModel = (value: string): StoredEditorModel => {
  const parsed = JSON.parse(value) as Partial<StoredEditorModel>;
  return {
    background: parsed.background ?? null,
    layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    formFields: Array.isArray(parsed.formFields) ? parsed.formFields : [],
  };
};

export const serializeStoredProductCustomizationModel = (
  customization: StoredProductCustomizationModel,
) =>
  JSON.stringify({
    canvasWidthPx: customization.canvasWidthPx,
    canvasHeightPx: customization.canvasHeightPx,
    layers: customization.layers,
    formFields: customization.formFields,
  } satisfies StoredProductCustomizationModel);

export const parseStoredProductCustomizationModel = (
  value: string,
): StoredProductCustomizationModel => {
  const parsed = JSON.parse(value) as Partial<StoredProductCustomizationModel>;
  const draftModel = {
    canvasWidthPx:
      typeof parsed.canvasWidthPx === "number" ? parsed.canvasWidthPx : null,
    canvasHeightPx:
      typeof parsed.canvasHeightPx === "number" ? parsed.canvasHeightPx : null,
    layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    formFields: Array.isArray(parsed.formFields) ? parsed.formFields : [],
  } satisfies StoredProductCustomizationModel;

  const validated = validateProductCustomizationDraft(draftModel);

  return validated.valid
    ? draftModel
    : {
        canvasWidthPx: draftModel.canvasWidthPx,
        canvasHeightPx: draftModel.canvasHeightPx,
        layers: [],
        formFields: [],
      };
};

export const buildTemplate = ({
  id,
  productId,
  name,
  revision,
  status,
  stored,
}: {
  id: string;
  productId: number | string;
  name: string;
  revision: number;
  status: CustomizationTemplate["status"];
  stored: StoredEditorModel;
}): CustomizationTemplate => ({
  id,
  productId: String(productId),
  name,
  revision,
  status,
  background: stored.background,
  layers: stored.layers,
  formFields: stored.formFields,
});

export const readTemplateRevision = async (
  db: ReturnType<typeof getDb>,
  templateId: string,
  revisionId?: string | null,
) => {
  const revision = revisionId
    ? await db
        .select()
        .from(customizationTemplateRevisions)
        .where(eq(customizationTemplateRevisions.id, revisionId))
        .get()
    : await db
        .select()
        .from(customizationTemplateRevisions)
        .where(eq(customizationTemplateRevisions.templateId, templateId))
        .orderBy(desc(customizationTemplateRevisions.revision))
        .get();

  if (!revision) return null;
  return {
    revision,
    stored: parseStoredEditorModel(revision.blocksJson),
  };
};

export const resolveAndValidateDesign = (
  template: CustomizationTemplate,
  submittedDesign: CustomizationDesign,
) => {
  const design = submittedDesign.values
    ? {
        ...buildDesignFromForm({
          template,
          values: submittedDesign.values,
          designId: submittedDesign.id,
        }),
        revision: submittedDesign.revision,
        status: submittedDesign.status,
      }
    : submittedDesign;
  const templateResult = validateTemplateForPublish(template);
  const formResult = submittedDesign.values
    ? validateCustomizationValues({ template, values: submittedDesign.values })
    : { valid: true, issues: [] };
  return {
    design,
    result: {
      valid: templateResult.valid && formResult.valid,
      issues: [...templateResult.issues, ...formResult.issues],
    },
  };
};
