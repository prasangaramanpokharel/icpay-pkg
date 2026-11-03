import { BucketClient, type BucketClientOptions, type UploadOptions } from "./client.js"
import { ICBucketError, unwrapResult } from "./errors.js"
import type { ApiResult, FileListPage, FilePublic } from "./types.js"

export interface S3ClientCredentials {
  accessKeyId?: string
  secretAccessKey?: string
}

export interface S3ClientConfig extends Omit<BucketClientOptions, "apiKey"> {
  region?: string
  endpoint?: string
  credentials?: S3ClientCredentials
  apiKey?: string
}

export type S3BodyInput = string | Uint8Array | ArrayBuffer | ArrayBufferView

export interface PutObjectCommandInput {
  Bucket: string
  Key: string
  Body: S3BodyInput
  ContentType?: string
  Metadata?: Record<string, string>
  Tags?: string[]
}

export interface PutObjectCommandOutput {
  ETag: string
  VersionId?: string
  $metadata: { httpStatusCode: number }
}

export interface GetObjectCommandInput {
  Bucket: string
  Key: string
}

export type S3Body = Uint8Array & {
  transformToString: (encoding?: string) => Promise<string>
  transformToByteArray: () => Promise<Uint8Array>
}

export interface GetObjectCommandOutput {
  Body: S3Body
  ContentLength: number
  ContentType: string
  ETag: string
  LastModified?: Date
  Metadata: Record<string, string>
  $metadata: { httpStatusCode: number }
}

export interface ListObjectsV2CommandInput {
  Bucket: string
  Prefix?: string
  MaxKeys?: number
  ContinuationToken?: string
}

export interface S3ObjectSummary {
  Key: string
  LastModified: Date
  Size: number
  ETag: string
}

export interface ListObjectsV2CommandOutput {
  Name: string
  Prefix?: string
  MaxKeys: number
  KeyCount: number
  IsTruncated: boolean
  NextContinuationToken?: string
  Contents: S3ObjectSummary[]
  $metadata: { httpStatusCode: number }
}

export interface DeleteObjectCommandInput {
  Bucket: string
  Key: string
}

export interface DeleteObjectCommandOutput {
  DeleteMarker?: boolean
  $metadata: { httpStatusCode: number }
}

export interface HeadObjectCommandInput {
  Bucket: string
  Key: string
}

export interface HeadObjectCommandOutput {
  ContentLength: number
  ContentType: string
  ETag: string
  LastModified: Date
  Metadata: Record<string, string>
  $metadata: { httpStatusCode: number }
}

export interface CopyObjectCommandInput {
  Bucket: string
  CopySource: string
  Key: string
}

export interface CopyObjectCommandOutput {
  CopyObjectResult: {
    ETag: string
    LastModified: Date
  }
  $metadata: { httpStatusCode: number }
}

export interface S3Command<TInput, TOutput> {
  readonly input: TInput
  execute(client: S3Client): Promise<TOutput>
}

function normalizeKey(key: string): string {
  return key.startsWith("/") ? key : `/${key}`
}

function stripLeadingSlash(key: string): string {
  return key.startsWith("/") ? key.slice(1) : key
}

function toUint8Array(body: S3BodyInput): Uint8Array {
  if (typeof body === "string") {
    return new TextEncoder().encode(body)
  }
  if (body instanceof Uint8Array) {
    return body
  }
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
  }
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body)
  }
  throw new ICBucketError("INVALID_REQUEST", "Unsupported S3 Body type")
}

function wrapBody(data: Uint8Array): S3Body {
  const wrapped = data as S3Body
  wrapped.transformToString = async (encoding = "utf-8") => {
    return new TextDecoder(encoding).decode(data)
  }
  wrapped.transformToByteArray = async () => data
  return wrapped
}

export class PutObjectCommand implements S3Command<PutObjectCommandInput, PutObjectCommandOutput> {
  constructor(readonly input: PutObjectCommandInput) {}
  execute(client: S3Client): Promise<PutObjectCommandOutput> {
    return client.putObject(this.input)
  }
}

export class GetObjectCommand implements S3Command<GetObjectCommandInput, GetObjectCommandOutput> {
  constructor(readonly input: GetObjectCommandInput) {}
  execute(client: S3Client): Promise<GetObjectCommandOutput> {
    return client.getObject(this.input)
  }
}

export class ListObjectsV2Command implements S3Command<ListObjectsV2CommandInput, ListObjectsV2CommandOutput> {
  constructor(readonly input: ListObjectsV2CommandInput) {}
  execute(client: S3Client): Promise<ListObjectsV2CommandOutput> {
    return client.listObjectsV2(this.input)
  }
}

export class DeleteObjectCommand implements S3Command<DeleteObjectCommandInput, DeleteObjectCommandOutput> {
  constructor(readonly input: DeleteObjectCommandInput) {}
  execute(client: S3Client): Promise<DeleteObjectCommandOutput> {
    return client.deleteObject(this.input)
  }
}

export class HeadObjectCommand implements S3Command<HeadObjectCommandInput, HeadObjectCommandOutput> {
  constructor(readonly input: HeadObjectCommandInput) {}
  execute(client: S3Client): Promise<HeadObjectCommandOutput> {
    return client.headObject(this.input)
  }
}

export class CopyObjectCommand implements S3Command<CopyObjectCommandInput, CopyObjectCommandOutput> {
  constructor(readonly input: CopyObjectCommandInput) {}
  execute(client: S3Client): Promise<CopyObjectCommandOutput> {
    return client.copyObject(this.input)
  }
}

export class S3Client {
  readonly client: BucketClient
  private readonly defaultBucket?: string

  constructor(config: S3ClientConfig = {}) {
    const extractedKey =
      config.apiKey ??
      config.credentials?.accessKeyId ??
      config.credentials?.secretAccessKey

    this.defaultBucket = config.bucketId
    this.client = new BucketClient({
      ...config,
      apiKey: extractedKey,
    })
  }

  async send<TInput, TOutput>(command: S3Command<TInput, TOutput>): Promise<TOutput> {
    return command.execute(this)
  }

  async putObject(input: PutObjectCommandInput): Promise<PutObjectCommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    const path = normalizeKey(input.Key)
    const data = toUint8Array(input.Body)

    const uploadOptions: UploadOptions = {
      bucketId: bucket,
      path,
      data,
      contentType: input.ContentType ?? "application/octet-stream",
    }

    const res = await this.client.uploadFile(uploadOptions)
    if ("err" in res) {
      const errCode = res.err.includes("not found")
        ? "NoSuchBucket"
        : res.err.includes("Access denied") || res.err.includes("lacks")
        ? "AccessDenied"
        : "PutObjectFailed"
      const error = new ICBucketError(errCode, res.err)
      error.name = errCode
      throw error
    }

    if (input.Metadata) {
      try {
        await this.client.setFileMetadata(bucket, path, JSON.stringify(input.Metadata))
      } catch {
      }
    }

    if (input.Tags && input.Tags.length > 0) {
      try {
        await this.client.setFileTags(bucket, path, input.Tags)
      } catch {
      }
    }

    return {
      ETag: `"${res.ok}"`,
      VersionId: res.ok,
      $metadata: { httpStatusCode: 200 },
    }
  }

  async getObject(input: GetObjectCommandInput): Promise<GetObjectCommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    const path = normalizeKey(input.Key)
    const [fileRes, dataRes] = await Promise.all([
      this.client.getFile(bucket, path),
      this.client.downloadFile(bucket, path),
    ])

    if ("err" in dataRes) {
      const errCode = dataRes.err.includes("not found") ? "NoSuchKey" : "AccessDenied"
      const error = new ICBucketError(errCode, dataRes.err)
      error.name = errCode
      throw error
    }

    let parsedMetadata: Record<string, string> = {}
    let contentType = "application/octet-stream"
    let lastModified = new Date()

    if ("ok" in fileRes) {
      contentType = fileRes.ok.contentType || contentType
      if (fileRes.ok.createdAt) {
        lastModified = new Date(Number(fileRes.ok.createdAt) / 1_000_000)
      }
      if (fileRes.ok.metadata && fileRes.ok.metadata.length > 0 && fileRes.ok.metadata[0]) {
        try {
          parsedMetadata = JSON.parse(fileRes.ok.metadata[0])
        } catch {
          parsedMetadata = { raw: fileRes.ok.metadata[0] }
        }
      }
    }

    return {
      Body: wrapBody(dataRes.ok),
      ContentLength: dataRes.ok.byteLength,
      ContentType: contentType,
      ETag: `"${"ok" in fileRes ? fileRes.ok.id : "icp-file"}"`,
      LastModified: lastModified,
      Metadata: parsedMetadata,
      $metadata: { httpStatusCode: 200 },
    }
  }

  async listObjectsV2(input: ListObjectsV2CommandInput): Promise<ListObjectsV2CommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    const page = input.ContinuationToken ? Number(input.ContinuationToken) : 0
    const pageSize = input.MaxKeys ?? 100
    let res: ApiResult<FileListPage>
    if (input.Prefix) {
      const trimmed = input.Prefix.trim()
      if (trimmed.endsWith("/")) {
        res = await this.client.listFolder(bucket, normalizeKey(trimmed), page, pageSize)
      } else {
        res = await this.client.searchFiles(bucket, trimmed, page, pageSize)
      }
    } else {
      res = await this.client.listFiles(bucket, page, pageSize)
    }

    if ("err" in res) {
      const errCode = res.err.includes("not found") ? "NoSuchBucket" : "AccessDenied"
      const error = new ICBucketError(errCode, res.err)
      error.name = errCode
      throw error
    }

    let items = res.ok.items
    if (input.Prefix && !input.Prefix.endsWith("/")) {
      const prefixClean = stripLeadingSlash(input.Prefix)
      items = items.filter((item) => stripLeadingSlash(item.path).includes(prefixClean))
    }

    const contents: S3ObjectSummary[] = items.map((item) => ({
      Key: stripLeadingSlash(item.path),
      LastModified: new Date(Number(item.createdAt) / 1_000_000),
      Size: Number(item.size),
      ETag: `"${item.id}"`,
    }))

    const total = Number(res.ok.total)
    const isTruncated = (page + 1) * pageSize < total

    return {
      Name: bucket,
      Prefix: input.Prefix,
      MaxKeys: pageSize,
      KeyCount: contents.length,
      IsTruncated: isTruncated,
      NextContinuationToken: isTruncated ? String(page + 1) : undefined,
      Contents: contents,
      $metadata: { httpStatusCode: 200 },
    }
  }

  async deleteObject(input: DeleteObjectCommandInput): Promise<DeleteObjectCommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    const path = normalizeKey(input.Key)
    const res = await this.client.deleteFile(bucket, path)
    if ("err" in res && !res.err.includes("not found")) {
      const errCode = "AccessDenied"
      const error = new ICBucketError(errCode, res.err)
      error.name = errCode
      throw error
    }

    return {
      DeleteMarker: true,
      $metadata: { httpStatusCode: 204 },
    }
  }

  async headObject(input: HeadObjectCommandInput): Promise<HeadObjectCommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    const path = normalizeKey(input.Key)
    const fileRes = await this.client.getFile(bucket, path)
    if ("err" in fileRes) {
      const errCode = fileRes.err.includes("not found") ? "NoSuchKey" : "AccessDenied"
      const error = new ICBucketError(errCode, fileRes.err)
      error.name = errCode
      throw error
    }

    let parsedMetadata: Record<string, string> = {}
    if (fileRes.ok.metadata && fileRes.ok.metadata.length > 0 && fileRes.ok.metadata[0]) {
      try {
        parsedMetadata = JSON.parse(fileRes.ok.metadata[0])
      } catch {
        parsedMetadata = { raw: fileRes.ok.metadata[0] }
      }
    }

    return {
      ContentLength: Number(fileRes.ok.size),
      ContentType: fileRes.ok.contentType || "application/octet-stream",
      ETag: `"${fileRes.ok.id}"`,
      LastModified: new Date(Number(fileRes.ok.createdAt) / 1_000_000),
      Metadata: parsedMetadata,
      $metadata: { httpStatusCode: 200 },
    }
  }

  async copyObject(input: CopyObjectCommandInput): Promise<CopyObjectCommandOutput> {
    const bucket = input.Bucket || this.defaultBucket
    if (!bucket) throw new ICBucketError("INVALID_REQUEST", "Bucket is required")

    let sourcePath = input.CopySource
    if (sourcePath.startsWith(`${bucket}/`)) {
      sourcePath = sourcePath.slice(bucket.length + 1)
    } else if (sourcePath.startsWith(`/${bucket}/`)) {
      sourcePath = sourcePath.slice(bucket.length + 2)
    }

    const source = normalizeKey(sourcePath)
    const dest = normalizeKey(input.Key)

    const res = await this.client.copyFile(bucket, source, dest)
    if ("err" in res) {
      const errCode = res.err.includes("not found") ? "NoSuchKey" : "AccessDenied"
      const error = new ICBucketError(errCode, res.err)
      error.name = errCode
      throw error
    }

    return {
      CopyObjectResult: {
        ETag: `"${res.ok.id}"`,
        LastModified: new Date(Number(res.ok.createdAt) / 1_000_000),
      },
      $metadata: { httpStatusCode: 200 },
    }
  }
}

export { S3Client as S3BucketClient }
