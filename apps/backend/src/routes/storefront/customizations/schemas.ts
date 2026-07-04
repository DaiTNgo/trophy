import type { CustomizationDesign, CustomizationTemplate } from "@trophy/customization";
import * as v from "valibot";

export const identifier = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120));
export const productIdInput = v.union([
  v.pipe(v.number(), v.integer(), v.minValue(1)),
  v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
]);

export const templateInputSchema = v.object({
  productId: productIdInput,
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  background: v.nullable(v.unknown()),
  layers: v.pipe(v.array(v.unknown()), v.maxLength(200)),
  formFields: v.pipe(v.array(v.unknown()), v.maxLength(200)),
});

export const templatePayloadSchema = v.object({
  template: v.pipe(v.unknown(), v.transform((template) => template as CustomizationTemplate)),
});

export const designSchema = v.pipe(v.unknown(), v.transform((design) => design as CustomizationDesign));

export const validatePayloadSchema = v.intersect([
  templatePayloadSchema,
  v.object({ design: designSchema }),
]);

export const exportPayloadSchema = v.intersect([
  validatePayloadSchema,
  v.object({ layerId: v.optional(identifier) }),
]);

export const templateParamsSchema = v.object({ id: identifier });
export const productParamsSchema = v.object({
  productId: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
});


