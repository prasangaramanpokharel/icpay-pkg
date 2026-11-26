# icpay-bucket

TypeScript & Node.js client for [ICPay Bucket](https://icpay.app) — high-performance on-chain file storage on the Internet Computer.

**Canister:** `6vbhm-nqaaa-aaaan-q6muq-cai` · **Version:** 1.4.0

**Docs:** [Package guide](https://icpay.app/icpay-bucket-sdk) · [API reference](https://icpay.app/bucket/docs)

---

## Installation

```bash
npm install icpay-bucket
```

---

## Concurrent Multipart Upload & Progress Tracking (v1.4.0)

Built-in zero-dependency worker pool engine supporting bounded concurrency, exponential backoff with jitter, WebCrypto SHA-256 integrity, and real-time progress events:

```ts
import { BucketClient, Upload } from "icpay-bucket"

const client = new BucketClient({ apiKey: process.env.BUCKET_API_KEY, bucketId: "icp" })

// 1. High-throughput upload with real-time progress
const result = await client.upload({
  path: "/videos/presentation.mp4",
  data: fileBuffer,
  concurrency: 6,
  onProgress: (p) => {
    console.log(`${p.percentage}% | Speed: ${p.speed} B/s | ETA: ${p.etaSeconds}s`)
  },
})

// 2. AWS S3 @aws-sdk/lib-storage compatibility
const s3Upload = new Upload({
  client: s3,
  params: { Bucket: "icp", Key: "build.tar", Body: tarBuffer },
  queueSize: 4,
})
s3Upload.on("httpUploadProgress", (p) => console.log(p.loaded, p.total))
await s3Upload.done()
```

---

## Quick Start (Modern API)

Initialize with your API key and default bucket name to enjoy clean sub-resource methods:

```ts
import { BucketClient, unwrapResult } from "icpay-bucket"

const client = new BucketClient({
  apiKey: process.env.BUCKET_API_KEY,
  bucketId: "icp",
})

// 1. Upload file (automatic chunking for large files)
const fileId = unwrapResult(await client.files.upload({
  path: "/documents/report.pdf",
  data: new Uint8Array(...),
  contentType: "application/pdf",
}))

// 2. Fast CDN URL (edge-cached)
console.log(client.files.url("/documents/report.pdf"))
// => https://cloud.icpay.app/cloud/icp/documents/report.pdf

// 3. Check file existence & fetch metadata
const exists = unwrapResult(await client.files.exists("/documents/report.pdf"))
const file = unwrapResult(await client.files.get("/documents/report.pdf"))

// 4. Paginated file listing
const page = unwrapResult(await client.files.list({ page: 0, pageSize: 20 }))

// 5. Check bucket capacity & metrics
const stats = unwrapResult(await client.usage())
console.log(`Used: ${stats.storageUsed} / ${stats.capacity} bytes`)

// 6. Delete file
await client.files.delete("/documents/report.pdf")
```

---

## AWS S3 & Cloudflare R2 Drop-in Compatibility

`icpay-bucket` includes an AWS SDK v3 compatible client (`S3Client`, `PutObjectCommand`, `GetObjectCommand`, `ListObjectsV2Command`, `DeleteObjectCommand`, `HeadObjectCommand`, `CopyObjectCommand`):

```ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "icpay-bucket"
// or import from "icpay-bucket/s3"

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.BUCKET_API_KEY!,
    secretAccessKey: process.env.BUCKET_API_KEY!,
  },
  bucketId: "icp",
})

// 1. PutObject
await s3.send(
  new PutObjectCommand({
    Bucket: "icp",
    Key: "docs/report.pdf",
    Body: fileBuffer,
    ContentType: "application/pdf",
    Metadata: { project: "icpay" },
  })
)
```

---

## Supabase Storage Drop-in Compatibility

Migrate from Supabase Storage (`@supabase/storage-js` or `@supabase/supabase-js`) in **1 line** by changing your import to `icpay-bucket/supabase`:

```ts
import { createClient } from "icpay-bucket/supabase"

const supabase = createClient({ apiKey: process.env.ICPAY_BUCKET_KEY })

// Exactly identical Supabase API!
const { data, error } = await supabase.storage
  .from("avatars")
  .upload("user-1.png", fileBuffer, {
    contentType: "image/png",
    upsert: true,
  })

// Get Public CDN URL
const { data: { publicUrl } } = supabase.storage
  .from("avatars")
  .getPublicUrl("user-1.png")
```

---

## Google Cloud Storage (GCS) Drop-in Compatibility

Migrate from Google Cloud Storage (`@google-cloud/storage`) in **1 line** by changing your import to `icpay-bucket/gcs`:

```ts
import { Storage } from "icpay-bucket/gcs"

const storage = new Storage({ apiKey: process.env.ICPAY_BUCKET_KEY })

// Exactly identical Google Cloud Storage API!
const bucket = storage.bucket("my-bucket")
const file = bucket.file("reports/2026.pdf")

await file.save(pdfBuffer, { contentType: "application/pdf" })

const [contents] = await file.download()
const url = file.publicUrl()
```

// 2. GetObject & Stream / String transformation
const response = await s3.send(
  new GetObjectCommand({
    Bucket: "icp",
    Key: "docs/report.pdf",
  })
)
const text = await response.Body.transformToString()
const bytes = await response.Body.transformToByteArray()

// 3. ListObjectsV2
const list = await s3.send(
  new ListObjectsV2Command({
    Bucket: "icp",
    Prefix: "docs/",
    MaxKeys: 20,
  })
)

// 4. DeleteObject
await s3.send(
  new DeleteObjectCommand({
    Bucket: "icp",
    Key: "docs/report.pdf",
  })
)
```

---

## Error Handling

You can either inspect Candid result objects directly or unwrap them:

```ts
// Style A: Pattern matching
const res = await client.files.get("/avatar.png")
if ("err" in res) {
  console.error("Failed:", res.err)
} else {
  console.log("File:", res.ok)
}

// Style B: Typed unwrap with ICBucketError
import { unwrapResult, ICBucketError } from "icpay-bucket"

try {
  const file = unwrapResult(await client.files.get("/avatar.png"))
} catch (error) {
  if (error instanceof ICBucketError) {
    console.error(`[${error.code}] ${error.message}`)
  }
}
```

---

## Authentication Scopes

| Caller | Permissions |
|---|---|
| **Bucket owner** (Internet Identity) | All operations, bucket creation, renewals, API key management |
| **Read API key** | `list`, `download`, `get`, `exists`, `listFolder`, `search`, `metadata` |
| **Write API key** | `upload`, `update`, `move`, `copy`, tags, metadata, chunk sessions |
| **Delete API key** | `delete`, `bulkDelete` |

---

## API Reference

### Modern Sub-Resource (`client.files.*`)

| Method | Description |
|---|---|
| `client.files.upload(options)` | Uploads data (auto-chunks if payload > 1.85 MB) |
| `client.files.get(path, bucketId?, apiKey?)` | Fetch file metadata |
| `client.files.list({ page?, pageSize?, prefix?, searchQuery? })` | List, search, or filter files |
| `client.files.exists(path, bucketId?, apiKey?)` | Check if a path exists |
| `client.files.download(path, bucketId?, apiKey?)` | Download binary bytes |
| `client.files.delete(path, bucketId?, apiKey?)` | Delete single file |
| `client.files.copy(src, dest, bucketId?, apiKey?)` | Copy file to new destination |
| `client.files.move(src, dest, bucketId?, apiKey?)` | Move/rename file |
| `client.files.url(path, bucketId?, opts?)` | Synchronous CDN / Raw URL generator |
| `client.usage(bucketId?)` | Fetch storage usage and metrics |

### Buckets (Owner / Administrative)

| Method | Description |
|---|---|
| `getBucketPrice(capacityGB)` | Price quote for a capacity tier |
| `createBucket(name, capacityGB, visibility)` | Provision new canister bucket |
| `listBuckets()` | List all buckets owned by caller |
| `getBucket(id)` | Bucket details and status |
| `getBucketStats(id)` | Detailed usage statistics |
| `getRenewQuote(bucketId)` | Renewal quote calculation |
| `renewBucket(bucketId)` | Extend bucket lease period |
| `updateBucket(bucketId, name?, visibility?)` | Rename or update visibility |
| `deleteBucket(bucketId)` | Delete bucket |
| `getBucketCycleStatus()` | Canister cycle health (public) |

### Bulk Operations (Max 20 per call)

| Method | Description |
|---|---|
| `bulkDeleteFiles(bucketId, paths, apiKey?)` | Batch file deletion |
| `bulkMoveFiles(bucketId, operations, apiKey?)` | Batch move `[{ source, destination }]` |
| `bulkCopyFiles(bucketId, operations, apiKey?)` | Batch copy `[{ source, destination }]` |

### API Key Management (Owner)

| Method | Description |
|---|---|
| `createApiKey(bucketId, name, permissions)` | Generate scoped API key |
| `listApiKeys(bucketId)` | List active keys |
| `getApiKey(bucketId, keyId)` | View key details and hint |
| `updateApiKey(bucketId, keyId, options)` | Modify key permissions |
| `regenerateApiKey(bucketId, keyId)` | Re-roll secret token |
| `revokeApiKey(bucketId, keyId)` | Permanently invalidate key |

---

## Edge CDN vs Direct Gateway

* **Edge CDN (Recommended):** `https://cloud.icpay.app/cloud/{bucketName}{path}` (global caching, 3x lower latency).
* **Direct IC Gateway:** `https://6vbhm-nqaaa-aaaan-q6muq-cai.raw.icp0.io/cloud/{bucketName}{path}`.

---

## License

MIT
