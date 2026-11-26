import { BucketClient, type BucketClientOptions, type UploadOptions } from "./client.js"
import { ICBucketError, unwrapResult } from "./errors.js"
import type { FilePublic } from "./types.js"
import type { UploadProgress } from "./upload/index.js"

export interface StorageError {
  message: string
  statusCode?: string
  error?: string
}

export type StorageResponse<T> =
  | { data: T; error: null }
  | { data: null; error: StorageError }

export interface FileOptions {
  cacheControl?: string
  contentType?: string
  upsert?: boolean
  duplex?: string
  onUploadProgress?: (progress: UploadProgress) => void
  concurrency?: number
  chunkSize?: number
  signal?: AbortSignal
}

export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: {
    column?: string
    order?: string
  }
  search?: string
}

export interface FileObject {
  name: string
  id?: string
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: Record<string, unknown>
}

export class StorageFileApi {
  protected bucketId: string
  protected client: BucketClient

  constructor(bucketId: string, client: BucketClient) {
    this.bucketId = bucketId
    this.client = client
  }

  async upload(
    path: string,
    fileBody: string | Uint8Array | ArrayBuffer | ArrayBufferView | Blob,
    fileOptions?: FileOptions
  ): Promise<StorageResponse<{ path: string; id: string; fullPath: string }>> {
    try {
      let data: Uint8Array
      let contentType = fileOptions?.contentType

      if (typeof fileBody === "string") {
        data = new TextEncoder().encode(fileBody)
        contentType ??= "text/plain"
      } else if (fileBody instanceof Uint8Array) {
        data = fileBody
      } else if (fileBody instanceof ArrayBuffer) {
        data = new Uint8Array(fileBody)
      } else if (ArrayBuffer.isView(fileBody)) {
        data = new Uint8Array(fileBody.buffer, fileBody.byteOffset, fileBody.byteLength)
      } else if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
        data = new Uint8Array(await fileBody.arrayBuffer())
        contentType ??= fileBody.type || undefined
      } else {
        throw new Error("Unsupported body type for upload")
      }

      const cleanPath = path.startsWith("/") ? path : `/${path}`
      const uploadOpts: UploadOptions = {
        bucketId: this.bucketId,
        path: cleanPath,
        data,
        contentType,
        concurrency: fileOptions?.concurrency,
        chunkSize: fileOptions?.chunkSize,
        onProgress: fileOptions?.onUploadProgress,
        signal: fileOptions?.signal,
      }

      const res = await this.client.uploadFile(uploadOpts)
      const unwrap = unwrapResult(res)

      return {
        data: {
          path: cleanPath,
          id: unwrap,
          fullPath: `${this.bucketId}/${cleanPath}`,
        },
        error: null,
      }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: err instanceof ICBucketError ? err.code : "500",
        },
      }
    }
  }

  async download(path: string): Promise<StorageResponse<Blob>> {
    try {
      const cleanPath = path.startsWith("/") ? path : `/${path}`
      const [fileRes, dataRes] = await Promise.all([
        this.client.getFile(this.bucketId, cleanPath),
        this.client.downloadFile(this.bucketId, cleanPath),
      ])

      const data = unwrapResult(dataRes)
      const contentType = "ok" in fileRes ? fileRes.ok.contentType : "application/octet-stream"

      const blob = new Blob([data.buffer as ArrayBuffer], {
        type: contentType || "application/octet-stream",
      })
      return { data: blob, error: null }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: err instanceof ICBucketError ? err.code : "404",
        },
      }
    }
  }

  async list(
    path?: string,
    options?: SearchOptions
  ): Promise<StorageResponse<FileObject[]>> {
    try {
      const prefix = path ? (path.endsWith("/") ? path : `${path}/`) : undefined
      const page = options?.offset && options?.limit ? Math.floor(options.offset / options.limit) : 0
      const pageSize = options?.limit ?? 50

      const res = prefix
        ? await this.client.listFolder(this.bucketId, prefix, page, pageSize)
        : await this.client.listFiles(this.bucketId, page, pageSize)

      const listPage = unwrapResult(res)
      const items: FileObject[] = listPage.items.map((f: FilePublic) => {
        const updatedTime = f.updatedAt.length > 0 ? Number(f.updatedAt[0]) : Number(f.createdAt)
        return {
          name: f.name,
          id: f.path,
          created_at: new Date(Number(f.createdAt) / 1_000_000).toISOString(),
          updated_at: new Date(updatedTime / 1_000_000).toISOString(),
          metadata: {
            size: Number(f.size),
            mimetype: f.contentType,
          },
        }
      })

      return { data: items, error: null }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: err instanceof ICBucketError ? err.code : "500",
        },
      }
    }
  }

  async remove(paths: string[]): Promise<StorageResponse<FileObject[]>> {
    try {
      const deleted: FileObject[] = []
      for (const p of paths) {
        const cleanPath = p.startsWith("/") ? p.slice(1) : p
        const res = await this.client.deleteFile(this.bucketId, cleanPath)
        unwrapResult(res)
        deleted.push({ name: cleanPath })
      }
      return { data: deleted, error: null }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: err instanceof ICBucketError ? err.code : "500",
        },
      }
    }
  }

  getPublicUrl(
    path: string,
    options?: { download?: boolean | string; transform?: Record<string, unknown> }
  ): { data: { publicUrl: string } } {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path
    const url = this.client.publicUrl(this.bucketId, cleanPath)
    if (options?.download) {
      const filename = typeof options.download === "string" ? options.download : cleanPath.split("/").pop() || "download"
      const separator = url.includes("?") ? "&" : "?"
      return { data: { publicUrl: `${url}${separator}download=${encodeURIComponent(filename)}` } }
    }
    return { data: { publicUrl: url } }
  }

  async createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<StorageResponse<{ signedUrl: string }>> {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path
    const url = this.client.publicUrl(this.bucketId, cleanPath)
    const separator = url.includes("?") ? "&" : "?"
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
    return {
      data: { signedUrl: `${url}${separator}expires=${expiresAt}` },
      error: null,
    }
  }
}

export class StorageClient {
  private client: BucketClient

  constructor(options?: BucketClientOptions | string) {
    if (typeof options === "string") {
      this.client = new BucketClient({ apiKey: options })
    } else {
      this.client = new BucketClient(options)
    }
  }

  from(id: string): StorageFileApi {
    return new StorageFileApi(id, this.client)
  }

  async listBuckets(): Promise<StorageResponse<Array<{ id: string; name: string }>>> {
    try {
      const res = await this.client.listBuckets()
      const buckets = unwrapResult(res)
      return {
        data: buckets.map((b) => ({ id: b.name, name: b.name })),
        error: null,
      }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: "500",
        },
      }
    }
  }

  async createBucket(
    id: string,
    options?: { public?: boolean; capacityGB?: number }
  ): Promise<StorageResponse<{ name: string }>> {
    try {
      const visibility = options?.public === false ? { Private: null } : { Public: null }
      const capacity = options?.capacityGB ?? 10
      const res = await this.client.createBucket(id, capacity, visibility)
      unwrapResult(res)
      return { data: { name: id }, error: null }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: "500",
        },
      }
    }
  }

  async deleteBucket(id: string): Promise<StorageResponse<{ message: string }>> {
    try {
      const res = await this.client.deleteBucket(id)
      unwrapResult(res)
      return { data: { message: "Successfully deleted" }, error: null }
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
          statusCode: "500",
        },
      }
    }
  }
}

export function createClient(
  urlOrOptions?: string | (BucketClientOptions & { supabaseUrl?: string; supabaseKey?: string }),
  keyOrOptions?: string | BucketClientOptions
): { storage: StorageClient } {
  let opts: BucketClientOptions = {}

  if (typeof urlOrOptions === "object" && urlOrOptions !== null) {
    opts = { ...urlOrOptions }
    if (!opts.apiKey && urlOrOptions.supabaseKey) {
      opts.apiKey = urlOrOptions.supabaseKey
    }
  } else if (typeof keyOrOptions === "string") {
    opts.apiKey = keyOrOptions
  } else if (typeof keyOrOptions === "object" && keyOrOptions !== null) {
    opts = { ...keyOrOptions }
  }

  const storage = new StorageClient(opts)
  return { storage }
}
