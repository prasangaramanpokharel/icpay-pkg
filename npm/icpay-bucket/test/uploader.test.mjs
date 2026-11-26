import test from "node:test"
import assert from "node:assert/strict"
import {
  ConcurrentQueue,
  retryWithBackoff,
  ProgressTracker,
  computeSha256,
  MultipartUploader,
} from "../dist/upload/index.js"
import { S3Client, Upload } from "../dist/s3.js"

test("ConcurrentQueue bounds concurrency strictly", async () => {
  const queue = new ConcurrentQueue(2)
  let active = 0
  let maxActive = 0
  const tasks = Array.from({ length: 6 }, (_, i) => {
    return queue.add(async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 20))
      active--
      return i
    })
  })
  const results = await Promise.all(tasks)
  assert.equal(results.length, 6)
  assert.equal(maxActive, 2)
  assert.equal(active, 0)
})

test("retryWithBackoff retries and succeeds", async () => {
  let attempts = 0
  const result = await retryWithBackoff(
    async () => {
      attempts++
      if (attempts < 3) {
        throw new Error("Temporary network glitch")
      }
      return "success"
    },
    { maxRetries: 3, baseDelayMs: 5 }
  )
  assert.equal(result, "success")
  assert.equal(attempts, 3)
})

test("retryWithBackoff throws when retries are exhausted", async () => {
  let attempts = 0
  await assert.rejects(
    async () => {
      await retryWithBackoff(
        async () => {
          attempts++
          throw new Error("Permanent fatal error")
        },
        { maxRetries: 2, baseDelayMs: 5 }
      )
    },
    { message: "Permanent fatal error" }
  )
  assert.equal(attempts, 3)
})

test("ProgressTracker records chunks and computes accurate stats", () => {
  const emitted = []
  const tracker = new ProgressTracker(1000, 4, (p) => emitted.push(p))

  const p1 = tracker.recordChunk(250)
  assert.equal(p1.loaded, 250)
  assert.equal(p1.percentage, 25)
  assert.equal(p1.chunksCompleted, 1)
  assert.equal(p1.totalChunks, 4)

  const p2 = tracker.recordChunk(250)
  assert.equal(p2.loaded, 500)
  assert.equal(p2.percentage, 50)
  assert.equal(p2.chunksCompleted, 2)

  const p3 = tracker.recordChunk(500)
  assert.equal(p3.loaded, 1000)
  assert.equal(p3.percentage, 100)
  assert.equal(p3.chunksCompleted, 3)
  assert.equal(emitted.length, 3)
})

test("computeSha256 produces valid 64-char hex digest", async () => {
  const data = new TextEncoder().encode("icpay-multipart-upload-test")
  const hash = await computeSha256(data)
  assert.equal(typeof hash, "string")
  assert.equal(hash.length, 64)
  assert.match(hash, /^[0-9a-f]{64}$/)
})

test("MultipartUploader uploads chunks concurrently and finalizes", async () => {
  const uploadedChunks = []
  let completed = false
  let cancelled = false

  const mockActor = {
    beginFileUpload: async () => ({ ok: "upl-mock-123" }),
    uploadFileChunkIndexed: async (id, index, data) => {
      uploadedChunks.push({ id, index: Number(index), size: data.byteLength })
      return { ok: BigInt(data.byteLength) }
    },
    completeFileUpload: async () => {
      completed = true
      return { ok: "file-mock-uuid" }
    },
    cancelUpload: async () => {
      cancelled = true
      return { ok: null }
    },
    uploadFile: async () => ({ ok: "file-mock-uuid" }),
  }

  const payload = new Uint8Array(250_000)
  payload.fill(42)

  const progressUpdates = []
  const uploader = new MultipartUploader(mockActor, {
    bucketId: "test-bucket",
    path: "/big-file.bin",
    data: payload,
    chunkSize: 50_000,
    concurrency: 3,
    onProgress: (p) => progressUpdates.push(p.percentage),
  })

  const result = await uploader.upload()
  assert.equal(result.fileId, "file-mock-uuid")
  assert.equal(result.chunks, 5)
  assert.equal(result.totalBytes, 250_000)
  assert.equal(completed, true)
  assert.equal(cancelled, false)
  assert.equal(uploadedChunks.length, 5)
  assert.ok(progressUpdates.length >= 5)
  assert.equal(progressUpdates[progressUpdates.length - 1], 100)
})

test("MultipartUploader aborts and cancels session when signal aborted", async () => {
  let cancelCalled = false
  const mockActor = {
    beginFileUpload: async () => ({ ok: "upl-abort-test" }),
    uploadFileChunkIndexed: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { ok: 1000n }
    },
    completeFileUpload: async () => ({ ok: "file-id" }),
    cancelUpload: async () => {
      cancelCalled = true
      return { ok: null }
    },
    uploadFile: async () => ({ ok: "file-id" }),
  }

  const controller = new AbortController()
  const payload = new Uint8Array(100_000)

  const uploader = new MultipartUploader(mockActor, {
    bucketId: "test-bucket",
    path: "/aborted.bin",
    data: payload,
    chunkSize: 10_000,
    concurrency: 2,
    signal: controller.signal,
  })

  setTimeout(() => controller.abort(), 15)

  await assert.rejects(async () => {
    await uploader.upload()
  })
  assert.equal(cancelCalled, true)
})

test("S3 Upload wrapper dispatches progress and completes", async () => {
  let s3Uploaded = false
  const client = new S3Client({ apiKey: "key", bucketId: "b" })
  client.putObject = async (params) => {
    s3Uploaded = true
    if (params.onProgress) {
      params.onProgress({
        loaded: 500,
        total: 1000,
        bytesUploaded: 500,
        totalBytes: 1000,
        percentage: 50,
        speed: 1000,
        etaSeconds: 1,
        chunksCompleted: 1,
        totalChunks: 2,
      })
    }
    return { ETag: '"e-tag-123"', VersionId: "v1", $metadata: { httpStatusCode: 200 } }
  }

  const progressEvents = []
  const upload = new Upload({
    client,
    params: {
      Bucket: "b",
      Key: "data.bin",
      Body: new Uint8Array(1000),
    },
    queueSize: 4,
  })

  upload.on("httpUploadProgress", (p) => {
    progressEvents.push(p)
  })

  const output = await upload.done()
  assert.equal(s3Uploaded, true)
  assert.equal(output.ETag, '"e-tag-123"')
  assert.equal(progressEvents.length, 1)
  assert.equal(progressEvents[0].percentage, 50)
})
