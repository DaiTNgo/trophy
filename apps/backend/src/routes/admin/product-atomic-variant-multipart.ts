import * as v from 'valibot'
import { allowedMimeTypes, MAX_ASSET_BYTES } from '../../lib/asset-utils'
import { readImageDimensions } from '../../lib/image-dimensions'
import { atomicVariantCreateSchema } from './product-schemas'

export type ValidatedAtomicVariantMedia = {
  fieldId: string
  id: string
  fileName: string
  mimeType: string
  widthPx: number
  heightPx: number
  byteSize: number
  buffer: ArrayBuffer
}

const invalid = (error: string) => ({ success: false as const, error })

export type AtomicVariantInput = v.InferOutput<typeof atomicVariantCreateSchema>

export type ValidatedAtomicVariant = {
  input: AtomicVariantInput
  galleryMedia: ValidatedAtomicVariantMedia[]
  customizationMedia: ValidatedAtomicVariantMedia | null
}

async function validateFileWithField(file: File, fieldId: string): Promise<ValidatedAtomicVariantMedia | string> {
  const mimeType = file.type.trim().toLowerCase()
  if (!allowedMimeTypes.has(mimeType)) return 'Only PNG, JPEG, WEBP, and PDF product assets are supported'
  if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return 'Product asset exceeds the 20 MB limit'
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) return 'Product asset size is invalid'
  const dimensions = mimeType === 'application/pdf'
    ? { width: 800, height: 1131 }
    : readImageDimensions(mimeType, new Uint8Array(buffer))
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) return 'Media data is invalid or unsupported'
  return { fieldId, id: crypto.randomUUID(), fileName: file.name, mimeType, widthPx: dimensions.width, heightPx: dimensions.height, byteSize: buffer.byteLength, buffer }
}

async function validateCustomizationFileWithDeclaration(
  file: File,
  fieldId: string,
  dimensions: { widthPx: number; heightPx: number },
): Promise<ValidatedAtomicVariantMedia | string> {
  const mimeType = file.type.trim().toLowerCase()
  if (!allowedMimeTypes.has(mimeType)) return 'Only PNG, JPEG, WEBP, and PDF product assets are supported'
  if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return 'Product asset exceeds the 20 MB limit'
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) return 'Product asset size is invalid'
  return {
    fieldId,
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType,
    widthPx: dimensions.widthPx,
    heightPx: dimensions.heightPx,
    byteSize: buffer.byteLength,
    buffer,
  }
}

export async function parseAtomicVariantMultipart(request: Request): Promise<{ success: true; variant: ValidatedAtomicVariant } | { success: false; error: string }> {
  const formData = await request.formData().catch(() => null)
  if (!formData) return invalid('Multipart form data is required')

  const payload = formData.get('payload')
  if (typeof payload !== 'string') return invalid('Multipart payload is required')
  const json = (() => {
    try { return JSON.parse(payload) } catch { return undefined }
  })()
  if (json === undefined) return invalid('Multipart payload must be valid JSON')
  const parsed = v.safeParse(atomicVariantCreateSchema, json)
  if (!parsed.success) return invalid('Multipart payload validation failed')

  const declaredIds = [
    ...parsed.output.galleryMedia.map((media) => media.mediaId),
    ...(parsed.output.customizationMedia ? [parsed.output.customizationMedia.mediaId] : [])
  ]
  if (new Set(declaredIds).size !== declaredIds.length) return invalid('Each declared media ID must be unique')

  const supplied = new Map<string, File>()
  for (const [name, value] of formData.entries()) {
    if (name === 'payload') continue
    if (!(value instanceof File)) return invalid(`Multipart field ${name} must be a file`)
    if (supplied.has(name)) return invalid(`Multipart field ${name} must appear exactly once`)
    supplied.set(name, value)
  }
  if (declaredIds.some((id) => !supplied.has(id)) || supplied.size !== declaredIds.length) {
    return invalid('Each declared media ID must have exactly one matching file and no unreferenced files')
  }

  const galleryMedia: ValidatedAtomicVariantMedia[] = []
  for (const media of parsed.output.galleryMedia) {
    const file = supplied.get(media.mediaId)!
    const result = await validateFileWithField(file, media.mediaId)
    if (typeof result === 'string') return invalid(result)
    galleryMedia.push(result)
  }
  let customizationMedia: ValidatedAtomicVariantMedia | null = null
  if (parsed.output.customizationMedia) {
    const file = supplied.get(parsed.output.customizationMedia.mediaId)!
    const result = await validateCustomizationFileWithDeclaration(file, parsed.output.customizationMedia.mediaId, parsed.output.customizationMedia)
    if (typeof result === 'string') return invalid(result)
    customizationMedia = result
  }

  return { success: true, variant: { input: parsed.output, galleryMedia, customizationMedia } }
}
