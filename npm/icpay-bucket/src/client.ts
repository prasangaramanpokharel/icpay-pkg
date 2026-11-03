import {
  Actor,
  AnonymousIdentity,
  HttpAgent,
  type Identity,
} from "@icp-sdk/core/agent"
import { idlFactory, type BucketActor } from "./idl.js"
import { mapFile, mapFileListPage } from "./map.js"
import { DEFAULT_CANISTER_ID, DEFAULT_CDN_HOST, CDN_BASE_URL, publicFileUrl, UrlBuilder } from "./url.js"
import { ICBucketError } from "./errors.js"
import type {
  ApiKeyCreateResult,
  ApiKeyPermissions,
  ApiKeyPublic,
  ApiResult,
  BucketCycleStatus,
  BucketPublic,
  BucketRenewQuote,
  BucketRenewResult,
  BucketStats,
  BucketVisibility,
  FileListPage,
  FilePathOp,
  FilePublic,
  ListFilesOptions,
  UploadPayload,
  UploadStatus,
} from "./types.js"
import { SINGLE_MAX_BYTES } from "./types.js"

export type BucketClientOptions = {
  apiKey?: string
  bucketId?: string
  canisterId?: string
  identity?: Identity
  host?: string
  cdnHost?: string
}

export type UploadOptions = {
  bucketId?: string
  path: string
  data: Uint8Array
  contentType?: string
  apiKey?: string
  autoChunk?: boolean
  chunkSize?: number
}

function opt(value?: string): [] | [string] {
  return value ? [value] : []
}

export class FileOperations {
  private readonly client: BucketClient

  constructor(client: BucketClient) {
    this.client = client
  }

  url(path: string, bucketId?: string, opts?: { gateway?: "cdn" | "raw" }): string {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.publicUrl(targetBucket, path, opts)
  }

  upload(options: UploadOptions): Promise<ApiResult<string>> {
    return this.client.uploadFile(options)
  }

  get(path: string, bucketId?: string, apiKey?: string): Promise<ApiResult<FilePublic>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.getFile(targetBucket, path, apiKey)
  }

  list(options: ListFilesOptions = {}): Promise<ApiResult<FileListPage>> {
    const targetBucket = this.client.resolveBucketId(options.bucketId)
    if (options.prefix) {
      return this.client.listFolder(
        targetBucket,
        options.prefix,
        options.page ?? 0,
        options.pageSize ?? 20,
        options.apiKey
      )
    }
    if (options.searchQuery) {
      return this.client.searchFiles(
        targetBucket,
        options.searchQuery,
        options.page ?? 0,
        options.pageSize ?? 20,
        options.apiKey
      )
    }
    return this.client.listFiles(
      targetBucket,
      options.page ?? 0,
      options.pageSize ?? 20,
      options.apiKey
    )
  }

  delete(path: string, bucketId?: string, apiKey?: string): Promise<ApiResult<null>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.deleteFile(targetBucket, path, apiKey)
  }

  copy(
    sourcePath: string,
    destinationPath: string,
    bucketId?: string,
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.copyFile(targetBucket, sourcePath, destinationPath, apiKey)
  }

  move(
    sourcePath: string,
    destinationPath: string,
    bucketId?: string,
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.moveFile(targetBucket, sourcePath, destinationPath, apiKey)
  }

  exists(path: string, bucketId?: string, apiKey?: string): Promise<ApiResult<boolean>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.fileExists(targetBucket, path, apiKey)
  }

  download(path: string, bucketId?: string, apiKey?: string): Promise<ApiResult<Uint8Array>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.downloadFile(targetBucket, path, apiKey)
  }

  metadata(path: string, bucketId?: string, apiKey?: string): Promise<ApiResult<string>> {
    const targetBucket = this.client.resolveBucketId(bucketId)
    return this.client.getFileMetadata(targetBucket, path, apiKey)
  }
}

export class BucketClient {
  readonly files: FileOperations
  private readonly actor: BucketActor
  private readonly canisterId: string
  private readonly cdnHost?: string
  private readonly defaultBucketId?: string
  private apiKey?: string

  constructor(options: BucketClientOptions = {}) {
    const identity = options.identity ?? new AnonymousIdentity()
    this.canisterId = options.canisterId ?? DEFAULT_CANISTER_ID
    this.cdnHost = options.cdnHost
    this.defaultBucketId = options.bucketId
    this.apiKey = options.apiKey

    const host = options.host ?? "https://icp0.io"
    const agent = HttpAgent.createSync({ identity, host })
    this.actor = Actor.createActor<BucketActor>(idlFactory, {
      agent,
      canisterId: this.canisterId,
    })
    this.files = new FileOperations(this)
  }

  resolveBucketId(explicit?: string): string {
    const resolved = explicit ?? this.defaultBucketId
    if (!resolved) {
      throw new ICBucketError("INVALID_REQUEST", "bucketId is required")
    }
    return resolved
  }

  private key(explicit?: string): [] | [string] {
    return opt(explicit ?? this.apiKey)
  }

  publicUrl(
    bucketName: string,
    path: string,
    opts?: { gateway?: "cdn" | "raw" }
  ): string {
    return publicFileUrl(this.canisterId, bucketName, path, opts)
  }

  rawUrl(bucketName: string, path: string): string {
    return publicFileUrl(this.canisterId, bucketName, path, { gateway: "raw" })
  }

  usage(bucketId?: string): Promise<ApiResult<BucketStats>> {
    const targetBucket = this.resolveBucketId(bucketId)
    return this.getBucketStats(targetBucket)
  }

  getBucketPrice(capacityGB: number): Promise<ApiResult<bigint>> {
    return this.actor.getBucketPrice(BigInt(capacityGB))
  }

  createBucket(
    name: string,
    capacityGB: number,
    visibility: BucketVisibility
  ): Promise<ApiResult<string>> {
    return this.actor.createBucket(name, BigInt(capacityGB), visibility)
  }

  getBucket(id?: string): Promise<ApiResult<BucketPublic>> {
    const target = this.resolveBucketId(id)
    return this.actor.getBucket(target)
  }

  getBucketStats(id?: string): Promise<ApiResult<BucketStats>> {
    const target = this.resolveBucketId(id)
    return this.actor.getBucketStats(target)
  }

  getRenewQuote(bucketId?: string): Promise<ApiResult<BucketRenewQuote>> {
    const target = this.resolveBucketId(bucketId)
    return this.actor.getRenewQuote(target)
  }

  listBuckets(): Promise<ApiResult<BucketPublic[]>> {
    return this.actor.listBuckets()
  }

  renewBucket(bucketId?: string): Promise<ApiResult<BucketRenewResult>> {
    const target = this.resolveBucketId(bucketId)
    return this.actor.renewBucket(target)
  }

  updateBucket(
    bucketId?: string,
    name?: string,
    visibility?: BucketVisibility
  ): Promise<ApiResult<BucketPublic>> {
    const target = this.resolveBucketId(bucketId)
    return this.actor.updateBucket(target, opt(name), visibility ? [visibility] : [])
  }

  deleteBucket(bucketId?: string): Promise<ApiResult<null>> {
    const target = this.resolveBucketId(bucketId)
    return this.actor.deleteBucket(target)
  }

  getBucketCycleStatus(): Promise<ApiResult<BucketCycleStatus>> {
    return this.actor.getBucketCycleStatus()
  }

  async uploadFile(options: UploadOptions): Promise<ApiResult<string>> {
    const targetBucket = options.bucketId ?? this.defaultBucketId
    if (!targetBucket) {
      return { err: "bucketId is required" }
    }

    if (options.data.byteLength > SINGLE_MAX_BYTES) {
      if (options.autoChunk === false) {
        return { err: "File too large for single upload" }
      }

      const totalSize = BigInt(options.data.byteLength)
      const begin = await this.actor.beginFileUpload(
        targetBucket,
        options.path,
        options.contentType ?? "application/octet-stream",
        totalSize,
        this.key(options.apiKey)
      )
      if ("err" in begin) {
        return begin
      }

      const uploadId = begin.ok
      const chunkSize = options.chunkSize ?? 1_500_000
      const totalChunks = Math.ceil(options.data.byteLength / chunkSize)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, options.data.byteLength)
        const chunkData = options.data.subarray(start, end)
        const chunkRes = await this.actor.uploadFileChunkIndexed(uploadId, BigInt(i), chunkData)
        if ("err" in chunkRes) {
          try {
            await this.actor.cancelUpload(uploadId)
          } catch {
          }
          return { err: `Chunk ${i} failed: ${chunkRes.err}` }
        }
      }

      return this.actor.completeFileUpload(uploadId, this.key(options.apiKey))
    }

    return this.actor.uploadFile(
      targetBucket,
      options.path,
      options.data,
      options.contentType ?? "application/octet-stream",
      this.key(options.apiKey)
    )
  }

  beginFileUpload(
    bucketId: string,
    path: string,
    contentType: string,
    totalSize: number,
    apiKey?: string
  ): Promise<ApiResult<string>> {
    return this.actor.beginFileUpload(
      bucketId,
      path,
      contentType,
      BigInt(totalSize),
      this.key(apiKey)
    )
  }

  uploadFileChunk(uploadId: string, data: Uint8Array): Promise<ApiResult<bigint>> {
    return this.actor.uploadFileChunk(uploadId, data)
  }

  uploadFileChunkIndexed(
    uploadId: string,
    chunkIndex: number,
    data: Uint8Array
  ): Promise<ApiResult<bigint>> {
    return this.actor.uploadFileChunkIndexed(uploadId, BigInt(chunkIndex), data)
  }

  completeFileUpload(uploadId: string, apiKey?: string): Promise<ApiResult<string>> {
    return this.actor.completeFileUpload(uploadId, this.key(apiKey))
  }

  getUpload(uploadId: string): Promise<ApiResult<UploadStatus>> {
    return this.actor.getUpload(uploadId)
  }

  cancelUpload(uploadId: string): Promise<ApiResult<null>> {
    return this.actor.cancelUpload(uploadId)
  }

  downloadFile(bucketId: string, path: string, apiKey?: string): Promise<ApiResult<Uint8Array>> {
    return this.actor.downloadFile(bucketId, path, this.key(apiKey))
  }

  getPublicFileUrl(bucketId: string, path: string): Promise<ApiResult<string>> {
    return this.actor.getPublicFileUrl(bucketId, path)
  }

  async listFiles(
    bucketId: string,
    page = 0,
    pageSize = 20,
    apiKey?: string
  ): Promise<ApiResult<FileListPage>> {
    const res = await this.actor.listFiles(
      bucketId,
      BigInt(page),
      BigInt(pageSize),
      this.key(apiKey)
    )
    if ("err" in res) {
      return res
    }
    return { ok: mapFileListPage(res.ok) }
  }

  async getFile(bucketId: string, path: string, apiKey?: string): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.getFile(bucketId, path, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  fileExists(bucketId: string, path: string, apiKey?: string): Promise<ApiResult<boolean>> {
    return this.actor.fileExists(bucketId, path, this.key(apiKey))
  }

  async listFolder(
    bucketId: string,
    prefix: string,
    page = 0,
    pageSize = 20,
    apiKey?: string
  ): Promise<ApiResult<FileListPage>> {
    const res = await this.actor.listFolder(
      bucketId,
      prefix,
      BigInt(page),
      BigInt(pageSize),
      this.key(apiKey)
    )
    if ("err" in res) {
      return res
    }
    return { ok: mapFileListPage(res.ok) }
  }

  async searchFiles(
    bucketId: string,
    searchQuery: string,
    page = 0,
    pageSize = 20,
    apiKey?: string
  ): Promise<ApiResult<FileListPage>> {
    const res = await this.actor.searchFiles(
      bucketId,
      searchQuery,
      BigInt(page),
      BigInt(pageSize),
      this.key(apiKey)
    )
    if ("err" in res) {
      return res
    }
    return { ok: mapFileListPage(res.ok) }
  }

  getFileMetadata(bucketId: string, path: string, apiKey?: string): Promise<ApiResult<string>> {
    return this.actor.getFileMetadata(bucketId, path, this.key(apiKey))
  }

  deleteFile(bucketId: string, path: string, apiKey?: string): Promise<ApiResult<null>> {
    return this.actor.deleteFile(bucketId, path, this.key(apiKey))
  }

  async updateFile(
    bucketId: string,
    path: string,
    fields: { name?: string; contentType?: string; metadata?: string; apiKey?: string }
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.updateFile(
      bucketId,
      path,
      opt(fields.name),
      opt(fields.contentType),
      opt(fields.metadata),
      this.key(fields.apiKey)
    )
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async moveFile(
    bucketId: string,
    sourcePath: string,
    destinationPath: string,
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.moveFile(bucketId, sourcePath, destinationPath, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async copyFile(
    bucketId: string,
    sourcePath: string,
    destinationPath: string,
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.copyFile(bucketId, sourcePath, destinationPath, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async setFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.setFileTags(bucketId, path, tags, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async addFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.addFileTags(bucketId, path, tags, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async removeFileTags(
    bucketId: string,
    path: string,
    tags: string[],
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.removeFileTags(bucketId, path, tags, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  async setFileMetadata(
    bucketId: string,
    path: string,
    metadata: string,
    apiKey?: string
  ): Promise<ApiResult<FilePublic>> {
    const res = await this.actor.setFileMetadata(bucketId, path, metadata, this.key(apiKey))
    if ("err" in res) {
      return res
    }
    return { ok: mapFile(res.ok) }
  }

  bulkDeleteFiles(bucketId: string, paths: string[], apiKey?: string): Promise<ApiResult<bigint>> {
    return this.actor.bulkDeleteFiles(bucketId, paths, this.key(apiKey))
  }

  bulkMoveFiles(
    bucketId: string,
    operations: FilePathOp[],
    apiKey?: string
  ): Promise<ApiResult<bigint>> {
    return this.actor.bulkMoveFiles(bucketId, operations, this.key(apiKey))
  }

  bulkCopyFiles(
    bucketId: string,
    operations: FilePathOp[],
    apiKey?: string
  ): Promise<ApiResult<bigint>> {
    return this.actor.bulkCopyFiles(bucketId, operations, this.key(apiKey))
  }

  createApiKey(
    bucketId: string,
    name: string,
    permissions: ApiKeyPermissions
  ): Promise<ApiResult<ApiKeyCreateResult>> {
    return this.actor.createApiKey(bucketId, name, permissions)
  }

  listApiKeys(bucketId: string): Promise<ApiResult<ApiKeyPublic[]>> {
    return this.actor.listApiKeys(bucketId)
  }

  getApiKey(bucketId: string, keyId: string): Promise<ApiResult<ApiKeyPublic>> {
    return this.actor.getApiKey(bucketId, keyId)
  }

  updateApiKey(
    bucketId: string,
    keyId: string,
    name?: string,
    permissions?: ApiKeyPermissions
  ): Promise<ApiResult<ApiKeyPublic>> {
    return this.actor.updateApiKey(bucketId, keyId, opt(name), permissions ? [permissions] : [])
  }

  regenerateApiKey(bucketId: string, keyId: string): Promise<ApiResult<ApiKeyCreateResult>> {
    return this.actor.regenerateApiKey(bucketId, keyId)
  }

  revokeApiKey(bucketId: string, keyId: string): Promise<ApiResult<null>> {
    return this.actor.revokeApiKey(bucketId, keyId)
  }
}

export { publicFileUrl, UrlBuilder, DEFAULT_CANISTER_ID, DEFAULT_CDN_HOST, CDN_BASE_URL, SINGLE_MAX_BYTES }
export type {
  ApiKeyCreateResult,
  ApiKeyPermissions,
  ApiKeyPublic,
  ApiResult,
  BucketCycleStatus,
  BucketPublic,
  BucketRenewQuote,
  BucketRenewResult,
  BucketStats,
  BucketVisibility,
  FileListPage,
  FilePathOp,
  FilePublic,
  ListFilesOptions,
  UploadPayload,
  UploadStatus,
} from "./types.js"
