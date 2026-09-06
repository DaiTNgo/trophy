import * as v from 'valibot'
import { allowedMimeTypes, extensionForMimeType, MAX_ASSET_BYTES } from '../../lib/asset-utils'
import { readImageDimensions } from '../../lib/image-dimensions'
import { fullCreateProductSchema } from './product-schemas'

export type FullCreateInput = v.InferOutput<typeof fullCreateProductSchema>

export type ValidatedFullCreateMedia = {
  id: string
  fieldId: string
  fileName: string
  mimeType: string
  widthPx: number
  heightPx: number
  byteSize: number
  buffer: ArrayBuffer
  previewBuffer?: ArrayBuffer
  previewMimeType?: string
}

const invalid = (error: string) => ({ success: false as const, error })

export async function parseFullCreateMultipart(request: Request) {
  const formData = await request.formData().catch(() => null)
  if (!formData) return invalid('Multipart form data is required')
  const payloadValue = formData?.get('payload')
  if (typeof payloadValue !== 'string') return invalid('Multipart payload is required')

  const json = (() => {
    try { return JSON.parse(payloadValue) } catch { return undefined }
  })()
  if (json === undefined) return invalid('Multipart payload must be valid JSON')
  const parsed = v.safeParse(fullCreateProductSchema, json)
  if (!parsed.success) return invalid('Multipart payload validation failed')

  const declaredIds = parsed.output.variants.flatMap((variant) => [
    ...variant.media.map((media) => media.mediaId),
    ...(variant.customizationMedia ? [variant.customizationMedia.mediaId] : [])
  ])
  if (new Set(declaredIds).size !== declaredIds.length) return invalid('Each declared media ID must be unique')

  const supplied = new Map<string, File[]>()
  const suppliedPreviews = new Map<string, File>()
  for (const [name, value] of formData.entries()) {
    if (name === 'payload') continue
    if (!(value instanceof File)) return invalid(`Multipart field ${name} must be a file`)
    if (name.endsWith('_preview')) {
      const baseId = name.replace(/_preview$/, '')
      suppliedPreviews.set(baseId, value)
    } else {
      supplied.set(name, [...(supplied.get(name) ?? []), value])
    }
  }
  if (supplied.size !== declaredIds.length || declaredIds.some((id) => supplied.get(id)?.length !== 1)) {
    return invalid('Each declared media ID must have exactly one matching file and no unreferenced files')
  }

  const media = new Map<string, ValidatedFullCreateMedia>()
  for (const id of declaredIds) {
    const file = supplied.get(id)![0]
    const mimeType = file.type.trim().toLowerCase()
    if (!allowedMimeTypes.has(mimeType)) return invalid('Only PNG, JPEG, WEBP, and PDF product assets are supported')
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return invalid('Product asset exceeds the 20 MB limit')
    const buffer = await file.arrayBuffer()
    if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) return invalid('Product asset size is invalid')
    const dimensions = mimeType === 'application/pdf'
      ? { width: 800, height: 1131 }
      : readImageDimensions(mimeType, new Uint8Array(buffer))
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) return invalid('Media data is invalid or unsupported')
    let previewBuffer: ArrayBuffer | undefined
    let previewMimeType: string | undefined
    const previewFile = suppliedPreviews.get(id)
    if (previewFile && mimeType === 'application/pdf') {
      previewBuffer = await previewFile.arrayBuffer()
      previewMimeType = previewFile.type.trim().toLowerCase()
    }
    media.set(id, {
      id: crypto.randomUUID(),
      fieldId: id,
      fileName: file.name,
      mimeType,
      widthPx: dimensions.width,
      heightPx: dimensions.height,
      byteSize: buffer.byteLength,
      buffer,
      previewBuffer,
      previewMimeType,
    })
  }

  return { success: true as const, input: parsed.output, media }
}

export const fullCreateAssetInput = (
  media: ValidatedFullCreateMedia,
  objectKey: string,
  productId: number,
  previewObjectKey: string | null = null,
) => ({
  id: media.id,
  ownerKey: `catalog:${productId}`,
  objectKey,
  previewObjectKey,
  fileName: media.fileName,
  mimeType: media.mimeType,
  widthPx: media.widthPx,
  heightPx: media.heightPx,
  byteSize: media.byteSize
})

export { extensionForMimeType }
