import { BucketClient, type BucketClientOptions, type UploadOptions } from "./client.js"
import { unwrapResult } from "./errors.js"
import type { FilePublic } from "./types.js"
import type { UploadProgress } from "./upload/index.js"

export interface SaveOptions {
  contentType?: string
  metadata?: Record<string, unknown>
  resumable?: boolean
  validation?: boolean | string
  onProgress?: (progress: UploadProgress) => void
  concurrency?: number
  chunkSize?: number
  signal?: AbortSignal
}

export interface GetFilesOptions {
  prefix?: string
  maxResults?: number
  pageToken?: string
}

export class GcsFile {
  readonly name: string
  readonly bucket: GcsBucket
  private readonly client: BucketClient

  constructor(bucket: GcsBucket, name: string, client: BucketClient) {
    this.bucket = bucket
    this.name = name.startsWith("/") ? name.slice(1) : name
    this.client = client
  }

  async save(
    data: string | Uint8Array | ArrayBuffer | ArrayBufferView,
    options?: SaveOptions
  ): Promise<void> {
    let payload: Uint8Array
    let contentType = options?.contentType

    if (typeof data === "string") {
      payload = new TextEncoder().encode(data)
      contentType ??= "text/plain"
    } else if (data instanceof Uint8Array) {
      payload = data
    } else if (data instanceof ArrayBuffer) {
      payload = new Uint8Array(data)
    } else if (ArrayBuffer.isView(data)) {
      payload = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } else {
      payload = new Uint8Array(data as unknown as ArrayBuffer)
    }

    const uploadPath = this.name.startsWith("/") ? this.name : `/${this.name}`
    const uploadOpts: UploadOptions = {
      bucketId: this.bucket.name,
      path: uploadPath,
      data: payload,
      contentType,
      concurrency: options?.concurrency,
      chunkSize: options?.chunkSize,
      onProgress: options?.onProgress,
      signal: options?.signal,
    }

    const res = await this.client.uploadFile(uploadOpts)
    unwrapResult(res)
  }

  async download(): Promise<[Uint8Array]> {
    const downloadPath = this.name.startsWith("/") ? this.name : `/${this.name}`
    const res = await this.client.downloadFile(this.bucket.name, downloadPath)
    const data = unwrapResult(res)
    return [data]
  }

  async delete(): Promise<void> {
    const deletePath = this.name.startsWith("/") ? this.name : `/${this.name}`
    const res = await this.client.deleteFile(this.bucket.name, deletePath)
    unwrapResult(res)
  }

  async exists(): Promise<[boolean]> {
    try {
      const checkPath = this.name.startsWith("/") ? this.name : `/${this.name}`
      const res = await this.client.getFile(this.bucket.name, checkPath)
      return ["ok" in res]
    } catch {
      return [false]
    }
  }

  async getMetadata(): Promise<[Record<string, unknown>]> {
    const res = await this.client.getFile(this.bucket.name, this.name)
    const file = unwrapResult(res)
    const updatedTime = file.updatedAt.length > 0 ? Number(file.updatedAt[0]) : Number(file.createdAt)
    const metadata: Record<string, unknown> = {
      name: file.name,
      bucket: this.bucket.name,
      size: Number(file.size),
      contentType: file.contentType,
      timeCreated: new Date(Number(file.createdAt) / 1_000_000).toISOString(),
      updated: new Date(updatedTime / 1_000_000).toISOString(),
    }
    return [metadata]
  }

  publicUrl(): string {
    return this.client.publicUrl(this.bucket.name, this.name)
  }
}

export class GcsBucket {
  readonly name: string
  private readonly client: BucketClient

  constructor(name: string, client: BucketClient) {
    this.name = name
    this.client = client
  }

  file(name: string): GcsFile {
    return new GcsFile(this, name, this.client)
  }

  async getFiles(options?: GetFilesOptions): Promise<[GcsFile[]]> {
    const prefix = options?.prefix
    const pageSize = options?.maxResults ?? 50
    const page = 0

    const res = prefix
      ? await this.client.listFolder(this.name, prefix, page, pageSize)
      : await this.client.listFiles(this.name, page, pageSize)

    const listPage = unwrapResult(res)
    const files = listPage.items.map((item: FilePublic) => new GcsFile(this, item.path || item.name, this.client))
    return [files]
  }

  async delete(): Promise<void> {
    const res = await this.client.deleteBucket(this.name)
    unwrapResult(res)
  }

  async exists(): Promise<[boolean]> {
    try {
      const res = await this.client.getBucket(this.name)
      return ["ok" in res]
    } catch {
      return [false]
    }
  }
}

export interface StorageOptions extends BucketClientOptions {
  projectId?: string
  keyFilename?: string
}

export class Storage {
  private readonly client: BucketClient

  constructor(options?: StorageOptions) {
    this.client = new BucketClient(options)
  }

  bucket(name: string): GcsBucket {
    return new GcsBucket(name, this.client)
  }

  async getBuckets(): Promise<[GcsBucket[]]> {
    const res = await this.client.listBuckets()
    const buckets = unwrapResult(res)
    return [buckets.map((b) => new GcsBucket(b.name, this.client))]
  }

  async createBucket(name: string, options?: { capacityGB?: number }): Promise<[GcsBucket]> {
    const capacity = options?.capacityGB ?? 10
    const res = await this.client.createBucket(name, capacity, { Public: null })
    unwrapResult(res)
    return [new GcsBucket(name, this.client)]
  }
}
