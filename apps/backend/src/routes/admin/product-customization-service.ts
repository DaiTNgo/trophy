import {
  validateProductCustomizationForPublish,
  type ProductCustomization
} from '@trophy/customization'

type CustomizationInput = {
  enabled: boolean
  layers: unknown[]
  formFields: unknown[]
}

type SubmittedVariant = {
  customizationMedia?: { assetId: string } | null
  [key: string]: unknown
}

type ProductAsset = {
  widthPx: number | null
  heightPx: number | null
}

export function deriveCustomizationCanvas(
  submittedVariants: SubmittedVariant[],
  assetsById: Map<string, ProductAsset>
) {
  for (const variant of submittedVariants) {
    const assetId = variant.customizationMedia?.assetId
    const asset = assetId ? assetsById.get(assetId) : null
    if (asset?.widthPx && asset?.heightPx) {
      return { canvasWidthPx: asset.widthPx, canvasHeightPx: asset.heightPx }
    }
  }

  return { canvasWidthPx: null, canvasHeightPx: null }
}

export function buildProductCustomizationInsert({
  productId,
  customization,
  submittedVariants,
  assetsById,
  now = new Date().toISOString()
}: {
  productId: number
  customization?: CustomizationInput | null
  submittedVariants: SubmittedVariant[]
  assetsById: Map<string, ProductAsset>
  now?: string
}) {
  if (!customization?.enabled) return null

  const derivedCanvas = deriveCustomizationCanvas(submittedVariants, assetsById)
  return {
    productId,
    enabled: true,
    canvasWidthPx: derivedCanvas.canvasWidthPx,
    canvasHeightPx: derivedCanvas.canvasHeightPx,
    layersJson: JSON.stringify(customization.layers),
    formFieldsJson: JSON.stringify(customization.formFields),
    createdAt: now,
    updatedAt: now
  }
}

export function validateCustomizationPublishReadiness({
  customization,
  submittedVariants,
  assetsById
}: {
  customization: CustomizationInput
  submittedVariants: SubmittedVariant[]
  assetsById: Map<string, ProductAsset>
}) {
  for (const variant of submittedVariants) {
    if (!variant.customizationMedia?.assetId) {
      return 'Each variant needs Customization Media before publish'
    }
  }

  const derivedCanvas = deriveCustomizationCanvas(submittedVariants, assetsById)
  if (!derivedCanvas.canvasWidthPx || !derivedCanvas.canvasHeightPx) {
    return 'Customization requires at least one valid Customization Media asset before publish'
  }

  for (const variant of submittedVariants) {
    const asset = assetsById.get(variant.customizationMedia!.assetId)
    if (!asset?.widthPx || !asset?.heightPx) {
      return 'Customization requires valid dimensions for every Customization Media asset'
    }
    if (
      asset.widthPx !== derivedCanvas.canvasWidthPx ||
      asset.heightPx !== derivedCanvas.canvasHeightPx
    ) {
      return 'All Customization Media assets must share the same size before publish'
    }
  }

  const validation = validateProductCustomizationForPublish({
    productId: 'pending',
    enabled: customization.enabled,
    canvasWidthPx: derivedCanvas.canvasWidthPx,
    canvasHeightPx: derivedCanvas.canvasHeightPx,
    layers: customization.layers as ProductCustomization['layers'],
    formFields: customization.formFields as ProductCustomization['formFields']
  })

  return validation.valid ? null : validation.issues[0]?.message ?? 'Customization is invalid'
}
