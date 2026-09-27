import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'

const MIME_TYPES_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
}

export interface StorageObjectMetadata {
  contentType?: string
  etag?: string
  size?: number
}

export interface StorageObject {
  body: ReadableStream
  arrayBuffer: () => Promise<ArrayBuffer>
  text: () => Promise<string>
  json: () => Promise<any>
  writeHttpMetadata: (headers: Headers) => void
  httpMetadata?: {
    contentType?: string
  }
  httpEtag: string
  size: number
}

export interface StoragePutOptions {
  httpMetadata?: {
    contentType?: string
  }
}

export interface StorageAdapter {
  get(key: string): Promise<StorageObject | null>
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Uint8Array | string | Buffer,
    options?: StoragePutOptions
  ): Promise<void>
  delete(key: string | string[]): Promise<void>
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(
      baseDir || process.env.STORAGE_DIR || path.join(process.cwd(), 'storage')
    )
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  private getFilePath(key: string): string {
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '')
    const resolved = path.resolve(this.baseDir, safeKey)
    const baseWithSep = this.baseDir.endsWith(path.sep) ? this.baseDir : `${this.baseDir}${path.sep}`
    if (resolved !== this.baseDir && !resolved.startsWith(baseWithSep)) {
      throw new Error('Access denied: Path traversal detected')
    }
    return resolved
  }

  private getMetaPath(key: string): string {
    return `${this.getFilePath(key)}.meta.json`
  }

  async get(key: string): Promise<StorageObject | null> {
    const filePath = this.getFilePath(key)
    try {
      const stats = await fs.stat(filePath)
      if (!stats.isFile()) return null

      let contentType = 'application/octet-stream'
      const metaPath = this.getMetaPath(key)
      try {
        const metaRaw = await fs.readFile(metaPath, 'utf8')
        const meta: StorageObjectMetadata = JSON.parse(metaRaw)
        if (meta.contentType) {
          contentType = meta.contentType
        }
      } catch {
        const ext = path.extname(key).toLowerCase()
        contentType = MIME_TYPES_BY_EXT[ext] || 'application/octet-stream'
      }

      const fileBuffer = await fs.readFile(filePath)
      const hash = crypto.createHash('md5').update(fileBuffer).digest('hex')
      const etag = `"${hash}"`

      const stream = Readable.toWeb(fsSync.createReadStream(filePath)) as unknown as ReadableStream

      return {
        body: stream,
        size: stats.size,
        httpEtag: etag,
        httpMetadata: { contentType },
        writeHttpMetadata: (headers: Headers) => {
          headers.set('content-type', contentType)
          headers.set('content-length', stats.size.toString())
        },
        arrayBuffer: async () => fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ),
        text: async () => fileBuffer.toString('utf8'),
        json: async () => JSON.parse(fileBuffer.toString('utf8'))
      }
    } catch {
      return null
    }
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | Uint8Array | string | Buffer,
    options?: StoragePutOptions
  ): Promise<void> {
    const filePath = this.getFilePath(key)
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    let buffer: Buffer
    if (Buffer.isBuffer(value)) {
      buffer = value
    } else if (value instanceof ArrayBuffer) {
      buffer = Buffer.from(value)
    } else if (value instanceof Uint8Array) {
      buffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    } else if (typeof value === 'string') {
      buffer = Buffer.from(value, 'utf8')
    } else if (value && typeof (value as ReadableStream).getReader === 'function') {
      const reader = (value as ReadableStream).getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        if (chunk) chunks.push(chunk)
      }
      buffer = Buffer.concat(chunks)
    } else {
      buffer = Buffer.from([])
    }

    await fs.writeFile(filePath, buffer)

    if (options?.httpMetadata) {
      const metaPath = this.getMetaPath(key)
      await fs.writeFile(
        metaPath,
        JSON.stringify({
          contentType: options.httpMetadata.contentType,
          size: buffer.length
        }),
        'utf8'
      )
    }
  }

  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key]
    await Promise.allSettled(
      keys.map(async (k) => {
        const filePath = this.getFilePath(k)
        const metaPath = this.getMetaPath(k)
        await fs.unlink(filePath).catch(() => undefined)
        await fs.unlink(metaPath).catch(() => undefined)
      })
    )
  }
}

export const getStorage = (baseDir?: string): StorageAdapter => {
  return new LocalStorageAdapter(baseDir)
}
