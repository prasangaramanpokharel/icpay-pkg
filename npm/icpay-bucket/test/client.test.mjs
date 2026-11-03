import test from "node:test"
import assert from "node:assert/strict"
import {
  BucketClient,
  ICBucket,
  UrlBuilder,
  publicFileUrl,
  ICBucketError,
  unwrapResult,
  CDN_BASE_URL,
  DEFAULT_CANISTER_ID,
  SINGLE_MAX_BYTES,
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "../dist/index.js"

test("UrlBuilder generates correct URLs", () => {
  const builder = new UrlBuilder("icp")
  assert.equal(
    builder.fileUrl("test.png"),
    `${CDN_BASE_URL}/cloud/icp/test.png`
  )
  assert.equal(
    builder.fileUrl("/nested/file.txt"),
    `${CDN_BASE_URL}/cloud/icp/nested/file.txt`
  )
  assert.equal(
    builder.fileUrl("spaces in name.pdf"),
    `${CDN_BASE_URL}/cloud/icp/spaces%20in%20name.pdf`
  )
})

test("publicFileUrl handles cdn and raw modes", () => {
  const cdnUrl = publicFileUrl(DEFAULT_CANISTER_ID, "my-bucket", "image.webp")
  assert.equal(cdnUrl, `${CDN_BASE_URL}/cloud/my-bucket/image.webp`)

  const rawUrl = publicFileUrl(DEFAULT_CANISTER_ID, "my-bucket", "image.webp", { gateway: "raw" })
  assert.equal(rawUrl, `https://${DEFAULT_CANISTER_ID}.raw.icp0.io/cloud/my-bucket/image.webp`)
})

test("ICBucketError supports flexible construction and unwrapResult", () => {
  const err1 = new ICBucketError("AUTHENTICATION_FAILED", "Invalid key", 401)
  assert.equal(err1.code, "AUTHENTICATION_FAILED")
  assert.equal(err1.message, "Invalid key")
  assert.equal(err1.status, 401)

  const err2 = new ICBucketError("Invalid key", "AUTHENTICATION_FAILED")
  assert.equal(err2.code, "AUTHENTICATION_FAILED")
  assert.equal(err2.message, "Invalid key")

  const fromErr = ICBucketError.fromError(new Error("Disk full"), "CAPACITY_EXCEEDED")
  assert.equal(fromErr.code, "CAPACITY_EXCEEDED")
  assert.equal(fromErr.message, "Disk full")

  const okVal = unwrapResult({ ok: "success_payload" })
  assert.equal(okVal, "success_payload")

  assert.throws(
    () => unwrapResult({ err: "Access denied" }, "PERMISSION_DENIED"),
    (err) => err instanceof ICBucketError && err.code === "PERMISSION_DENIED" && err.message === "Access denied"
  )
})

test("BucketClient initialization and FileOperations binding", () => {
  const client = new BucketClient({
    apiKey: "test_key",
    bucketId: "test_bucket",
  })

  assert.ok(client.files, "client.files sub-resource should be defined")
  assert.equal(
    client.files.url("docs/guide.md"),
    `${CDN_BASE_URL}/cloud/test_bucket/docs/guide.md`
  )
  assert.equal(client.resolveBucketId(), "test_bucket")
  assert.equal(client.resolveBucketId("other_bucket"), "other_bucket")

  const clientNoBucket = new BucketClient({ apiKey: "test_key" })
  assert.throws(
    () => clientNoBucket.resolveBucketId(),
    (err) => err instanceof ICBucketError && err.code === "INVALID_REQUEST"
  )
})

test("S3Client initialization and command wrappers", () => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: "icp_cloud_test_key_123",
      secretAccessKey: "secret_123",
    },
    bucketId: "test_bucket",
  })

  assert.ok(s3, "S3Client should initialize")
  assert.ok(s3.client, "S3Client internal BucketClient should be initialized")

  const putCmd = new PutObjectCommand({
    Bucket: "test_bucket",
    Key: "folder/test.txt",
    Body: "Hello S3 world",
    ContentType: "text/plain",
  })
  assert.equal(putCmd.input.Bucket, "test_bucket")
  assert.equal(putCmd.input.Key, "folder/test.txt")
  assert.equal(putCmd.input.ContentType, "text/plain")

  const getCmd = new GetObjectCommand({
    Bucket: "test_bucket",
    Key: "folder/test.txt",
  })
  assert.equal(getCmd.input.Bucket, "test_bucket")
  assert.equal(getCmd.input.Key, "folder/test.txt")

  const listCmd = new ListObjectsV2Command({
    Bucket: "test_bucket",
    Prefix: "folder/",
  })
  assert.equal(listCmd.input.Prefix, "folder/")

  const delCmd = new DeleteObjectCommand({
    Bucket: "test_bucket",
    Key: "folder/test.txt",
  })
  assert.equal(delCmd.input.Key, "folder/test.txt")
})

