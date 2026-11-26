import type { BucketActor } from "../idl.js"
import { ICBucketError } from "../errors.js"
import { SINGLE_MAX_BYTES } from "../types.js"
import { ConcurrentQueue } from "./queue.js"
import { retryWithBackoff } from "./retry.js"
import { ProgressTracker } from "./progress.js"
import { computeSha256 } from "./integrity.js"
import type {
  ChunkDescriptor,
  MultipartUploadOptions,
  UploadProgress,
  UploadResult,
  UploadSessionState,
} from "./types.js"

export function toUint8Array(
  data: Uint8Array | ArrayBuffer | ArrayBufferView | Blob
): Promise<Uint8Array> | Uint8Array {
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data.arrayBuffer().then((buf) => new Uint8Array(buf))
  }
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  throw new ICBucketError("INVALID_REQUEST", "Unsupported data format for upload")
}

export class MultipartUploader {
  private readonly actor: BucketActor
  private readonly options: MultipartUploadOptions
  private session?: UploadSessionState

  constructor(actor: BucketActor, options: MultipartUploadOptions) {
    this.actor = actor
    this.options = options
  }

  async upload(): Promise<UploadResult> {
    const rawData = await toUint8Array(this.options.data)
    const targetBucket = this.options.bucketId
    if (!targetBucket) {
      throw new ICBucketError("INVALID_REQUEST", "bucketId is required")
    }

    const defaultChunkSize = 1_048_576
    const chunkSize = Math.max(1, this.options.chunkSize ?? defaultChunkSize)
    const totalBytes = rawData.byteLength
    const apiKeyOpt: [] | [string] = this.options.apiKey ? [this.options.apiKey] : []

    if (totalBytes <= SINGLE_MAX_BYTES && (!this.options.chunkSize || this.options.chunkSize >= totalBytes)) {
      if (this.options.signal?.aborted) {
        throw new Error(this.options.signal.reason ?? "Upload aborted")
      }
      const res = await this.actor.uploadFile(
        targetBucket,
        this.options.path,
        rawData,
        this.options.contentType ?? "application/octet-stream",
        apiKeyOpt
      )
      if ("err" in res) {
        throw new ICBucketError("UPLOAD_FAILED", res.err)
      }
      if (this.options.onProgress) {
        const fullProgress: UploadProgress = {
          loaded: totalBytes,
          total: totalBytes,
          bytesUploaded: totalBytes,
          totalBytes,
          percentage: 100,
          speed: totalBytes,
          etaSeconds: 0,
          chunksCompleted: 1,
          totalChunks: 1,
        }
        try {
          this.options.onProgress(fullProgress)
        } catch {
        }
      }
      return {
        fileId: res.ok,
        totalBytes,
        chunks: 1,
      }
    }

    const beginRes = await this.actor.beginFileUpload(
      targetBucket,
      this.options.path,
      this.options.contentType ?? "application/octet-stream",
      BigInt(totalBytes),
      apiKeyOpt
    )
    if ("err" in beginRes) {
      throw new ICBucketError("UPLOAD_FAILED", `Failed to initiate multipart upload: ${beginRes.err}`)
    }

    const uploadId = beginRes.ok
    const totalChunks = Math.ceil(totalBytes / chunkSize)

    this.session = {
      uploadId,
      bucketId: targetBucket,
      path: this.options.path,
      totalBytes,
      chunkSize,
      totalChunks,
      completedChunks: new Set<number>(),
      aborted: false,
    }

    const chunks: ChunkDescriptor[] = []
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, totalBytes)
      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        data: rawData.subarray(start, end),
      })
    }

    const defaultConcurrency = typeof window !== "undefined" ? 4 : 6
    const concurrency = Math.max(1, this.options.concurrency ?? defaultConcurrency)
    const queue = new ConcurrentQueue(concurrency)
    const tracker = new ProgressTracker(totalBytes, totalChunks, this.options.onProgress)

    const onAbort = async () => {
      if (this.session) {
        this.session.aborted = true
      }
      if (!this.options.leavePartsOnError) {
        try {
          await this.actor.cancelUpload(uploadId)
        } catch {
        }
      }
    }

    if (this.options.signal) {
      if (this.options.signal.aborted) {
        await onAbort()
        throw new Error(this.options.signal.reason ?? "Upload aborted")
      }
      this.options.signal.addEventListener("abort", onAbort, { once: true })
    }

    try {
      const uploadPromises = chunks.map((chunk) => {
        return queue.add(async () => {
          if (this.options.signal?.aborted || this.session?.aborted) {
            throw new Error(this.options.signal?.reason ?? "Upload aborted")
          }

          if (this.options.verifyIntegrity) {
            chunk.sha256 = await computeSha256(chunk.data)
          }

          await retryWithBackoff(
            async () => {
              if (this.options.signal?.aborted || this.session?.aborted) {
                throw new Error(this.options.signal?.reason ?? "Upload aborted")
              }
              const res = await this.actor.uploadFileChunkIndexed(
                uploadId,
                BigInt(chunk.index),
                chunk.data
              )
              if ("err" in res) {
                throw new Error(res.err)
              }
              return res.ok
            },
            {
              maxRetries: this.options.maxRetries ?? 3,
              baseDelayMs: this.options.retryDelayMs ?? 300,
              signal: this.options.signal,
            }
          )

          this.session?.completedChunks.add(chunk.index)
          tracker.recordChunk(chunk.size)
        })
      })

      await Promise.all(uploadPromises)

      if (this.options.signal?.aborted || this.session?.aborted) {
        throw new Error(this.options.signal?.reason ?? "Upload aborted")
      }

      const completeRes = await this.actor.completeFileUpload(uploadId, apiKeyOpt)
      if ("err" in completeRes) {
        throw new ICBucketError("UPLOAD_FAILED", `Failed to complete upload: ${completeRes.err}`)
      }

      return {
        fileId: completeRes.ok,
        totalBytes,
        chunks: totalChunks,
      }
    } catch (err) {
      if (!this.options.leavePartsOnError) {
        try {
          await this.actor.cancelUpload(uploadId)
        } catch {
        }
      }
      if (err instanceof ICBucketError) {
        throw err
      }
      throw new ICBucketError("UPLOAD_FAILED", err instanceof Error ? err.message : String(err))
    } finally {
      if (this.options.signal) {
        this.options.signal.removeEventListener("abort", onAbort)
      }
    }
  }

  async abort(): Promise<void> {
    if (this.session && !this.session.aborted) {
      this.session.aborted = true
      try {
        await this.actor.cancelUpload(this.session.uploadId)
      } catch {
      }
    }
  }

  getSessionState(): UploadSessionState | undefined {
    return this.session
  }
}
