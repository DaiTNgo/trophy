import * as v from 'valibot'
import { allowedMimeTypes, MAX_ASSET_BYTES } from '../../lib/asset-utils'
import { customizationTemplateSchema } from './product-schemas'

export type ValidatedCustomizationBackground = {
  variantId: number
  id: string
  fileName: string
  mimeType: string
  widthPx: number
  heightPx: number
  byteSize: number
  buffer: ArrayBuffer
}

const invalid = (error: string) => ({ success: false as const, error })

type TemplateOutput = v.InferOutput<typeof customizationTemplateSchema>

type ActivationInput = {
  template: TemplateOutput
  backgrounds: ValidatedCustomizationBackground[]
}

type DeclaredDimensions = { widthPx: number; heightPx: number }

function declaredBackgroundDimensions(value: unknown, variantIds: number[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const declarations = value as Record<string, unknown>
  if (
    Object.keys(declarations).length !== variantIds.length ||
    variantIds.some((variantId) => {
      const dimensions = declarations[String(variantId)]
      return !dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions) ||
        !Number.isInteger((dimensions as DeclaredDimensions).widthPx) ||
        !Number.isInteger((dimensions as DeclaredDimensions).heightPx) ||
        (dimensions as DeclaredDimensions).widthPx < 1 ||
        (dimensions as DeclaredDimensions).heightPx < 1
    })
  ) return null
  return declarations as Record<string, DeclaredDimensions>
}

export async function parseCustomizationActivationMultipart(
  request: Request,
  variantIds: number[]
): Promise<{ success: true; input: ActivationInput } | { success: false; error: string }> {
  const formData = await request.formData().catch(() => null)
  if (!formData) return invalid('Multipart form data is required')

  const templateValue = formData.get('payload')
  if (typeof templateValue !== 'string') return invalid('Customization template is required')
  const templateJson = (() => {
    try { return JSON.parse(templateValue) } catch { return undefined }
  })()
  if (templateJson === undefined) return invalid('Customization template must be valid JSON')
  const templateResult = v.safeParse(customizationTemplateSchema, templateJson)
  if (!templateResult.success) return invalid('Customization template validation failed')

  const declared = declaredBackgroundDimensions(templateJson.backgrounds, variantIds)
  if (!declared) return invalid('Declared Customization Background dimensions are required for every requested variant')
  const backgrounds = await validateBackgroundCustomizationMedia(formData, variantIds, declared)
  if (!backgrounds.success) return { success: false, error: backgrounds.error }

  return { success: true, input: { template: templateResult.output, backgrounds: backgrounds.backgrounds } }
}

export async function parseCustomizationRepairMultipart(
  request: Request,
  variantIds: number[]
): Promise<{ success: true; input: { template: TemplateOutput; backgrounds: ValidatedCustomizationBackground[] } } | { success: false; error: string }> {
  const formData = await request.formData().catch(() => null)
  if (!formData) return invalid('Multipart form data is required')
  const templateValue = formData.get('payload')
  if (typeof templateValue !== 'string') return invalid('Customization template is required')
  const templateJson = (() => {
    try { return JSON.parse(templateValue) } catch { return undefined }
  })()
  if (templateJson === undefined) return invalid('Customization template must be valid JSON')
  const templateResult = v.safeParse(customizationTemplateSchema, templateJson)
  if (!templateResult.success) return invalid('Customization template validation failed')

  const declared = declaredBackgroundDimensions(templateJson.backgrounds, variantIds)
  if (!declared) return invalid('Declared Customization Background dimensions are required for every requested variant')
  const backgrounds = await validateBackgroundCustomizationMedia(formData, variantIds, declared)
  if (!backgrounds.success) return backgrounds

  return { success: true, input: { template: templateResult.output, backgrounds: backgrounds.backgrounds } }
}

async function validateBackgroundCustomizationMedia(
  formData: FormData,
  variantIds: number[],
  declared: Record<string, DeclaredDimensions>,
): Promise<{ success: true; backgrounds: ValidatedCustomizationBackground[] } | { success: false; error: string }> {
  const submitted = new Map<string, File[]>()
  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      submitted.set(name, [...(submitted.get(name) ?? []), value])
    }
  }
  if (
    submitted.size !== variantIds.length ||
    variantIds.some((id) => submitted.get(String(id))?.length !== 1)
  ) {
    return invalid('Exactly one Customization Background file is required for every requested variant')
  }

  const backgrounds: ValidatedCustomizationBackground[] = []
  for (const variantId of variantIds) {
    const file = submitted.get(String(variantId))![0]
    const mimeType = file.type.trim().toLowerCase()
    if (!allowedMimeTypes.has(mimeType)) return invalid('Only PNG, JPEG, WEBP, and PDF product assets are supported')
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return invalid('Product asset exceeds the 20 MB limit')
    const buffer = await file.arrayBuffer()
    if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) return invalid('Product asset size is invalid')
    const dimensions = declared[String(variantId)]
    backgrounds.push({ variantId, id: crypto.randomUUID(), fileName: file.name, mimeType, widthPx: dimensions.widthPx, heightPx: dimensions.heightPx, byteSize: buffer.byteLength, buffer })
  }
  return { success: true, backgrounds }
}
