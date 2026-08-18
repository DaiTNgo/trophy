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

export type CustomizationLifecycle = {
  hasSavedCustomization: boolean
  enabled: boolean
  active: boolean
  missingBackgroundVariantIds: number[]
  canvasWidthPx: number | null
  canvasHeightPx: number | null
}

type LifecycleProduct = {
  customization?: {
    enabled: boolean
    canvasWidthPx: number | null
    canvasHeightPx: number | null
  } | null
  variants: Array<{
    id: number
    customizationMedia?: { widthPx: number | null; heightPx: number | null } | null
  }>
}

export function deriveCustomizationLifecycle(product: LifecycleProduct): CustomizationLifecycle {
  const hasSavedCustomization = Boolean(product.customization)
  const enabled = hasSavedCustomization && Boolean(product.customization!.enabled)
  const canvasWidthPx = product.customization?.canvasWidthPx ?? null
  const canvasHeightPx = product.customization?.canvasHeightPx ?? null

  const missingBackgroundVariantIds = product.variants
    .filter((variant) => {
      const media = variant.customizationMedia
      if (!media) return true
      if (!canvasWidthPx || !canvasHeightPx) return true
      return media.widthPx !== canvasWidthPx || media.heightPx !== canvasHeightPx
    })
    .map((variant) => variant.id)

  return {
    hasSavedCustomization,
    enabled,
    active: enabled && missingBackgroundVariantIds.length === 0,
    missingBackgroundVariantIds,
    canvasWidthPx,
    canvasHeightPx
  }
}

export function validateBackgroundSizeContract(
  backgrounds: Array<{ widthPx: number; heightPx: number }>
): string | null {
  if (backgrounds.length === 0) {
    return 'Customization requires at least one Customization Background'
  }
  for (const background of backgrounds) {
    if (!background.widthPx || !background.heightPx) {
      return 'Customization Backgrounds must have valid dimensions'
    }
  }
  const first = backgrounds[0]!
  for (const background of backgrounds) {
    if (background.widthPx !== first.widthPx || background.heightPx !== first.heightPx) {
      return 'All Customization Backgrounds must share the same size'
    }
  }
  return null
}

export function collectCustomizationTranslationKeys(customization: {
  layersJson: string
  formFieldsJson: string
}): string[] {
  const keys: string[] = []
  let layers: unknown[] = []
  let formFields: Array<{ id: string }> = []
  try { layers = JSON.parse(customization.layersJson) } catch { layers = [] }
  try { formFields = JSON.parse(customization.formFieldsJson) } catch { formFields = [] }
  for (const field of formFields) {
    if (field.id) keys.push(String(field.id))
  }
  for (const layer of layers) {
    const typed = layer as { id?: string; type?: string; text?: { colorPolicy?: { mode?: string; options?: Array<{ value?: string }> }; fontPolicy?: { mode?: string; options?: Array<{ value?: string }> } } }
    if (typed.type !== 'text' || !typed.id) continue
    if (typed.text?.colorPolicy?.mode === 'shopper_selectable') {
      for (const option of typed.text.colorPolicy.options ?? []) {
        if (option.value) keys.push(`${typed.id}:color:${option.value}`)
      }
    }
    if (typed.text?.fontPolicy?.mode === 'shopper_selectable') {
      for (const option of typed.text.fontPolicy.options ?? []) {
        if (option.value) keys.push(`${typed.id}:font:${option.value}`)
      }
    }
  }
  return keys
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
