# icpay-bucket

[![npm version](https://img.shields.io/npm/v/icpay-bucket.svg?style=flat-square&color=indigo)](https://www.npmjs.com/package/icpay-bucket)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Internet Computer](https://img.shields.io/badge/Internet%20Computer-Mainnet-6366f1.svg?style=flat-square)](https://dashboard.internetcomputer.org/canister/6vbhm-nqaaa-aaaan-q6muq-cai)
[![Edge CDN](https://img.shields.io/badge/Edge%20CDN-Global%20HTTP%2F2-10b981.svg?style=flat-square)](https://cloud.icpay.app)

**Enterprise on-chain decentralized object storage for the Internet Computer.**  
Drop-in replacement for **AWS S3**, **Cloudflare R2**, **Supabase Storage**, and **Google Cloud Storage (GCS)** with permanent orthogonal persistence and global edge caching.

* **Canister:** `6vbhm-nqaaa-aaaan-q6muq-cai` (Custodial Wallet & Index)
* **Blob Store:** `fly6t-piaaa-aaaan-q6oga-cai` (Data Plane, 400 GB Shards)
* **Edge CDN:** `https://cloud.icpay.app/cloud/{bucketName}{path}`
* **NPM Package:** `icpay-bucket@1.4.0`

---

## Table of Contents

1. [Installation](#installation)
2. [Master Multi-Cloud Migration Guide](#master-multi-cloud-migration-guide)
   * [Migrating from AWS S3 & Cloudflare R2](#1-migrating-from-aws-s3--cloudflare-r2)
   * [Migrating from Supabase Storage](#2-migrating-from-supabase-storage)
   * [Migrating from Google Cloud Storage (GCS)](#3-migrating-from-google-cloud-storage-gcs)
3. [Concurrent Multipart Upload Engine (v1.4.0)](#concurrent-multipart-upload-engine-v140)
4. [Native Modern Client (`BucketClient`)](#native-modern-client-bucketclient)
5. [Multi-Cloud Feature Parity Matrix](#multi-cloud-feature-parity-matrix)
6. [Supported Formats & Security Guards](#supported-formats--security-guards)
7. [Error Handling & Result Unwrapping](#error-handling--result-unwrapping)
8. [Edge CDN & Direct Gateway](#edge-cdn--direct-gateway)
9. [Full API Reference](#full-api-reference)

---

## Installation

```bash
npm install icpay-bucket
```

```bash
pnpm add icpay-bucket
# or
yarn add icpay-bucket
```

---

## Master Multi-Cloud Migration Guide

`icpay-bucket` provides drop-in compatible adapter subpaths. Migrate existing codebases without rewriting application logic.

### 1. Migrating from AWS S3 & Cloudflare R2

Replace `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` with `icpay-bucket/s3`.

#### Before (AWS S3)

```ts
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
```

#### After (ICPay Cloud — 1-to-1 Parity)

```ts
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand, 
  Upload 
} from "icpay-bucket/s3"

const s3 = new S3Client({
  apiKey: process.env.ICPAY_API_KEY!,
  bucketId: "my-bucket",
})

// 1. Upload Object
const putRes = await s3.send(
  new PutObjectCommand({
    Bucket: "my-bucket",
    Key: "reports/quarterly.pdf",
    Body: fileBuffer,
    ContentType: "application/pdf",
    Metadata: { project: "finance" },
  })
)
console.log("ETag:", putRes.ETag)

// 2. Download Object & Stream Helpers
const getRes = await s3.send(
  new GetObjectCommand({
    Bucket: "my-bucket",
    Key: "reports/quarterly.pdf",
  })
)
const text = await getRes.Body.transformToString()
const bytes = await getRes.Body.transformToByteArray()

// 3. High-Throughput Concurrent Multipart Upload
const parallelUpload = new Upload({
  client: s3,
  params: {
    Bucket: "my-bucket",
    Key: "archives/dataset.zip",
    Body: largeBuffer,
  },
  queueSize: 6, // Concurrency worker pool
  partSize: 1024 * 1024, // 1 MiB chunk parts
})

parallelUpload.on("httpUploadProgress", (progress) => {
  console.log(`${progress.percentage}% | Speed: ${progress.speed} B/s`)
})
await parallelUpload.done()

// 4. List Objects (Hierarchical & Flat)
const list = await s3.send(
  new ListObjectsV2Command({
    Bucket: "my-bucket",
    Prefix: "reports/",
    MaxKeys: 20,
  })
)
console.log(`Found ${list.KeyCount} objects`)

// 5. Delete Object
await s3.send(
  new DeleteObjectCommand({
    Bucket: "my-bucket",
    Key: "reports/quarterly.pdf",
  })
)
```

---

### 2. Migrating from Supabase Storage

Replace `@supabase/storage-js` or `@supabase/supabase-js` storage instances in **1 line** with `icpay-bucket/supabase`.

#### Before (Supabase)

```ts
import { createClient } from "@supabase/supabase-js"
const supabase = createClient("https://xyz.supabase.co", process.env.SUPABASE_KEY!)
const { data, error } = await supabase.storage.from("avatars").upload("user-1.png", file)
```

#### After (ICPay Cloud — 1-to-1 Parity)

```ts
import { createClient } from "icpay-bucket/supabase"

const supabase = createClient({ apiKey: process.env.ICPAY_API_KEY! })
const bucket = supabase.storage.from("avatars")

// 1. Upload File with Progress Tracking
const { data, error } = await bucket.upload("profiles/user-1.png", fileBuffer, {
  contentType: "image/png",
  upsert: true,
  onUploadProgress: (progress) => {
    console.log(`Uploaded: ${progress.loaded} of ${progress.total} bytes`)
  },
})

// 2. Download File as Blob
const { data: blob, error: downErr } = await bucket.download("profiles/user-1.png")
const text = await blob.text()

// 3. Get Public Edge CDN URL (Sub-15ms worldwide)
const { data: { publicUrl } } = bucket.getPublicUrl("profiles/user-1.png")
console.log("Public CDN:", publicUrl)
// => https://cloud.icpay.app/cloud/avatars/profiles/user-1.png

// 4. Create Signed / Expiring URL
const { data: { signedUrl } } = await bucket.createSignedUrl("profiles/user-1.png", 3600)

// 5. List Files in Directory
const { data: files } = await bucket.list("profiles", {
  limit: 50,
  sortBy: { column: "name", order: "asc" },
})

// 6. Remove File
const { data: removed } = await bucket.remove(["profiles/user-1.png"])
```

---

### 3. Migrating from Google Cloud Storage (GCS)

Replace `@google-cloud/storage` in **1 line** with `icpay-bucket/gcs`.

#### Before (Google Cloud Storage)

```ts
import { Storage } from "@google-cloud/storage"
const storage = new Storage({ keyFilename: "gcp-key.json" })
const bucket = storage.bucket("my-assets")
await bucket.file("photos/pic.jpg").save(buffer)
```

#### After (ICPay Cloud — 1-to-1 Parity)

```ts
import { Storage } from "icpay-bucket/gcs"

const storage = new Storage({ apiKey: process.env.ICPAY_API_KEY! })
const bucket = storage.bucket("my-assets")
const file = bucket.file("photos/pic.jpg")

// 1. Save File with Progress & Concurrency
await file.save(imageBuffer, {
  contentType: "image/jpeg",
  resumable: true,
  onProgress: (p) => {
    console.log(`Uploaded ${p.percentage}% (${p.speed} B/s)`)
  },
})

// 2. Check File Existence
const [exists] = await file.exists()

// 3. Download File Bytes
const [contents] = await file.download()

// 4. Get Public Edge URL
const publicUrl = file.publicUrl()
console.log("GCS Edge URL:", publicUrl)
// => https://cloud.icpay.app/cloud/my-assets/photos/pic.jpg

// 5. List Files in Bucket
const [fileList] = await bucket.getFiles({ prefix: "photos/" })

// 6. Delete File
await file.delete()
```

---

## Concurrent Multipart Upload Engine (v1.4.0)

For high-throughput applications, the SDK includes a native, zero-dependency concurrent upload engine inspired by AWS S3 transfer manager and Google Cloud Storage resumable uploaders.

### Key Architecture

* **Worker Pool:** Bounded concurrency scheduler (`concurrency: 4` default in browser, `6` in Node.js, scalable up to `8`).
* **Chunk Sizing:** Configurable part sizing (defaults to 1 MiB per chunk).
* **Exponential Retry:** Failed chunks retry up to `maxRetries` with exponential backoff and randomized full jitter.
* **Integrity Validation:** Zero-overhead chunk hashing using native `crypto.subtle` (SHA-256).
* **Progress Tracking:** Real-time metrics calculating loaded bytes, transfer speed (B/s), percentage, and estimated time of arrival (ETA).
* **Cancellation:** First-class `AbortSignal` support triggering immediate canister session cleanup.

```ts
import { BucketClient, type UploadProgress } from "icpay-bucket"

const client = new BucketClient({
  apiKey: process.env.ICPAY_API_KEY!,
  bucketId: "production-data",
})

const controller = new AbortController()

const result = await client.upload({
  path: "/backups/database.tar.gz",
  data: myDataBuffer, // Uint8Array, Buffer, ArrayBuffer, or Blob
  contentType: "application/gzip",
  concurrency: 6, // 6 concurrent workers
  chunkSize: 1024 * 1024, // 1 MiB chunks
  maxRetries: 3,
  verifyIntegrity: true, // SHA-256 WebCrypto validation
  signal: controller.signal,
  onProgress: (progress: UploadProgress) => {
    console.log(`[${progress.percentage}%] ${progress.bytesUploaded}/${progress.totalBytes} B`)
    console.log(`Speed: ${(progress.speed / 1024).toFixed(1)} KB/s | ETA: ${progress.etaSeconds}s`)
    console.log(`Chunks: ${progress.chunksCompleted} of ${progress.totalChunks}`)
  },
})

console.log("Committed File ID:", result.fileId)
```

---

## Native Modern Client (`BucketClient`)

The native client offers a resource-oriented API optimized for TypeScript developers:

```ts
import { BucketClient, unwrapResult } from "icpay-bucket"

const client = new BucketClient({
  apiKey: process.env.ICPAY_API_KEY,
  bucketId: "my-bucket",
})

// Sub-Resource: client.files.*
const upload = unwrapResult(await client.files.upload({
  path: "/documents/report.pdf",
  data: pdfBuffer,
  contentType: "application/pdf",
}))

// Instant edge URL
const url = client.files.url("/documents/report.pdf")

// Check existence & metadata
const exists = unwrapResult(await client.files.exists("/documents/report.pdf"))
const meta = unwrapResult(await client.files.get("/documents/report.pdf"))

// File operations
await client.files.copy("/documents/report.pdf", "/archive/report-2026.pdf")
await client.files.move("/archive/report-2026.pdf", "/vault/report-final.pdf")
await client.files.delete("/vault/report-final.pdf")

// Paginated folder listing
const page = unwrapResult(await client.files.list({
  prefix: "documents/",
  page: 0,
  pageSize: 20,
}))

// Usage & capacity metrics
const stats = unwrapResult(await client.usage())
console.log(`Storage: ${stats.storageUsed} / ${stats.capacity} bytes used`)
```

---

## Multi-Cloud Feature Parity Matrix

| Feature | AWS S3 | Cloudflare R2 | Supabase Storage | GCS | ICPay Cloud |
|---|---|---|---|---|---|
| **Storage Architecture** | Centralized AWS Data Centers | Cloudflare Edge / Workers | AWS S3 Wrapper | Google Cloud Datacenters | **Decentralized Internet Computer Canisters** |
| **Persistence Model** | Cloud Block Store | Cloudflare Object Engine | S3 Bucket + Postgres Meta | Colossus File System | **Orthogonal Canister Stable Memory** |
| **API Compatibility** | Native | S3 Compatible | Custom JS SDK | Native GCS SDK | **100% Native + S3 + Supabase + GCS Adapters** |
| **Concurrent Multipart** | `@aws-sdk/lib-storage` | Supported | Partial | Resumable Upload | **Built-in Zero-Dependency Worker Pool (v1.4.0)** |
| **Global Edge CDN** | CloudFront ($ extra) | Included | Cloudflare CDN | Cloud CDN ($ extra) | **Included (`cloud.icpay.app`, Sub-15ms edge)** |
| **Bandwidth Egress Fees**| High ($0.09/GB) | $0 / Free Egress | High after tier limit | High ($0.12/GB) | **$0 Zero Egress Fees permanently** |
| **Server Actions / Next.js**| Requires Node Runtime | Requires Workers | Requires Supabase key | Requires GCP Auth | **Static Export Safe (`output: "export"`)** |
| **Browser Uploads** | Needs Presigned URL | Needs Presigned URL | Direct | Needs Signed URL | **Direct Browser Upload via API Key / Identity** |
| **Content Security** | Metadata only | Metadata only | Basic RLS | IAM Policies | **Hardware-Level Magic Byte Header Inspection** |

---

## Supported Formats & Security Guards

ICPay Cloud enforces on-chain binary header inspection to guarantee data safety and prevent stored XSS attacks on custom domains:

* **Images (Validated by Magic Bytes):** `png` (`0x89PNG`), `jpg`/`jpeg` (`0xFFD8FF`), `webp` (`RIFF...WEBP`), `gif` (`GIF87a/89a`), `avif`, `bmp`, `ico`, `tif`, `tiff`, `heic`, `heif`.
* **Documents:** `pdf` (Validated by `%PDF-`), `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `txt`, `md`, `csv`, `rtf`, `odt`, `ods`, `odp`.
* **Data & Archives:** `json`, `xml`, `yaml`, `yml`, `toml`, `zip` (Validated by `0x504B0304`), `tar`, `gz` (Validated by `0x1F8B`), `bz2`, `7z`, `rar`.
* **Audio & Fonts:** `mp3`, `wav`, `ogg`, `flac`, `m4a`, `aac`, `ttf`, `otf`, `woff`, `woff2`.
* **Blocked for Security:** `html`, `js`, `mjs`, `ts`, `svg`, `sh`, `wasm`, `py`, `bin`. Executable scripts and raw SVGs are rejected to protect users from stored cross-site scripting.
* **File Limits:** Up to 10 MB per file (25 MB for MP4 videos).

---

## Error Handling & Result Unwrapping

The client returns standard TypeScript union types `{ ok: T } | { err: string }` or throws strongly typed `ICBucketError` exceptions when unwrapped:

```ts
import { unwrapResult, ICBucketError } from "icpay-bucket"

// 1. Direct Pattern Matching (Zero exceptions)
const result = await client.files.get("/avatar.png")
if ("err" in result) {
  console.error("Lookup failed:", result.err)
} else {
  console.log("File metadata:", result.ok)
}

// 2. Strongly Typed Unwrapping
try {
  const file = unwrapResult(await client.files.get("/avatar.png"))
} catch (error) {
  if (error instanceof ICBucketError) {
    console.error(`[${error.code}] ${error.message}`)
  }
}
```

---

## Edge CDN & Direct Gateway

* **Global Edge CDN (Recommended):**  
  `https://cloud.icpay.app/cloud/{bucketName}{path}`  
  Features global Anycast edge caching (`Cache-Control: public, max-age=31536000, immutable`), wildcard CORS headers, and sub-15ms regional turnaround.
* **Direct IC Gateway:**  
  `https://6vbhm-nqaaa-aaaan-q6muq-cai.raw.icp0.io/cloud/{bucketName}{path}`  
  Direct, un-cached boundary node resolution directly from on-chain canister state.

---

## Full API Reference

### File Operations (`client.files.*`)

| Method | Parameters | Return Type | Description |
|---|---|---|---|
| `upload` | `UploadOptions` | `Promise<ApiResult<string>>` | Uploads file data (auto-chunks if payload exceeds 1.85 MB) |
| `get` | `path, bucketId?, apiKey?` | `Promise<ApiResult<FilePublic>>` | Retrieves file metadata and checksum |
| `list` | `ListFilesOptions` | `Promise<ApiResult<FileListPage>>` | Paginated listing with search and prefix filtering |
| `exists` | `path, bucketId?, apiKey?` | `Promise<ApiResult<boolean>>` | Tests whether a remote path exists |
| `download` | `path, bucketId?, apiKey?` | `Promise<ApiResult<Uint8Array>>` | Downloads binary bytes |
| `delete` | `path, bucketId?, apiKey?` | `Promise<ApiResult<null>>` | Deletes single file |
| `copy` | `src, dest, bucketId?, apiKey?` | `Promise<ApiResult<FilePublic>>` | Copies a file to a new path |
| `move` | `src, dest, bucketId?, apiKey?` | `Promise<ApiResult<FilePublic>>` | Renames/moves a file |
| `url` | `path, bucketId?, opts?` | `string` | Generates edge CDN or direct gateway URL |

### High-Throughput Engine (`client.upload`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | **Required** | Target path in bucket (e.g. `/videos/demo.mp4`) |
| `data` | `Uint8Array \| Buffer \| Blob` | **Required** | File payload bytes |
| `concurrency` | `number` | `4` (browser) / `6` (Node) | Concurrent worker pool limit |
| `chunkSize` | `number` | `1,048,576` (1 MiB) | Size of each chunk part |
| `maxRetries` | `number` | `3` | Maximum retry attempts per chunk |
| `verifyIntegrity`| `boolean` | `false` | Computes SHA-256 WebCrypto checksum |
| `signal` | `AbortSignal` | `undefined` | Abort signal for immediate cancellation |
| `onProgress` | `(p: UploadProgress) => void` | `undefined` | Real-time progress callback |

### Bucket Administration (Bucket Owner)

| Method | Parameters | Description |
|---|---|---|
| `createBucket` | `name, capacityGB, visibility` | Provisions a new decentralized bucket |
| `listBuckets` | — | Lists all buckets owned by caller |
| `getBucket` | `bucketId` | Queries bucket details and status |
| `getBucketStats` | `bucketId` | Queries real-time storage metrics and expiration |
| `renewBucket` | `bucketId` | Extends bucket lease duration |
| `deleteBucket` | `bucketId` | Deletes bucket and reclaims storage |
| `createApiKey` | `bucketId, name, permissions` | Generates scoped read/write API key |
| `revokeApiKey` | `bucketId, keyId` | Invalidates an API key |

---

## License

MIT © [ICPay](https://icpay.app)
