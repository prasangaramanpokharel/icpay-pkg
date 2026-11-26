import test from "node:test"
import assert from "node:assert/strict"
import { createClient, StorageClient } from "../dist/supabase.js"
import { Storage } from "../dist/gcs.js"

test("Supabase adapter exposes standard API surface", () => {
  const { storage } = createClient({ apiKey: "icp_cloud_test_key" })
  assert.ok(storage instanceof StorageClient)

  const bucket = storage.from("avatars")
  assert.equal(typeof bucket.upload, "function")
  assert.equal(typeof bucket.download, "function")
  assert.equal(typeof bucket.list, "function")
  assert.equal(typeof bucket.remove, "function")
  assert.equal(typeof bucket.getPublicUrl, "function")
  assert.equal(typeof bucket.createSignedUrl, "function")

  const { data } = bucket.getPublicUrl("user-1.png")
  assert.ok(data.publicUrl.includes("/cloud/avatars/user-1.png"))
})

test("Google Cloud Storage adapter exposes standard API surface", () => {
  const storage = new Storage({ apiKey: "icp_cloud_test_key" })
  assert.equal(typeof storage.bucket, "function")

  const bucket = storage.bucket("assets")
  assert.equal(typeof bucket.file, "function")
  assert.equal(typeof bucket.getFiles, "function")

  const file = bucket.file("photos/pic.jpg")
  assert.equal(typeof file.save, "function")
  assert.equal(typeof file.download, "function")
  assert.equal(typeof file.delete, "function")
  assert.equal(typeof file.exists, "function")
  assert.equal(typeof file.publicUrl, "function")

  const url = file.publicUrl()
  assert.ok(url.includes("/cloud/assets/photos/pic.jpg"))
})
