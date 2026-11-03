import unittest
from icpay_bucket import (
    BucketClient,
    UrlBuilder,
    public_file_url,
    ICBucketError,
    ErrorCode,
    unwrap_result,
    CDN_BASE_URL,
    DEFAULT_CANISTER_ID,
)


class TestICBucketPython(unittest.TestCase):
    def test_url_builder(self):
        builder = UrlBuilder(bucket_id="icp")
        self.assertEqual(builder.file_url("test.png"), f"{CDN_BASE_URL}/cloud/icp/test.png")
        self.assertEqual(builder.file_url("/nested/file.txt"), f"{CDN_BASE_URL}/cloud/icp/nested/file.txt")
        self.assertEqual(
            builder.file_url("spaces in name.pdf"),
            f"{CDN_BASE_URL}/cloud/icp/spaces%20in%20name.pdf",
        )

    def test_public_file_url(self):
        cdn_url = public_file_url(DEFAULT_CANISTER_ID, "my-bucket", "image.webp", gateway="cdn")
        self.assertEqual(cdn_url, f"{CDN_BASE_URL}/cloud/my-bucket/image.webp")

        raw_url = public_file_url(DEFAULT_CANISTER_ID, "my-bucket", "image.webp", gateway="raw")
        self.assertEqual(raw_url, f"https://{DEFAULT_CANISTER_ID}.raw.icp0.io/cloud/my-bucket/image.webp")

    def test_errors_and_unwrap(self):
        err1 = ICBucketError("AUTHENTICATION_FAILED", "Invalid key", status=401)
        self.assertEqual(err1.code, "AUTHENTICATION_FAILED")
        self.assertEqual(err1.message, "Invalid key")
        self.assertEqual(err1.status, 401)

        err2 = ICBucketError("Invalid key", "AUTHENTICATION_FAILED")
        self.assertEqual(err2.code, "AUTHENTICATION_FAILED")
        self.assertEqual(err2.message, "Invalid key")

        ok_val = unwrap_result({"ok": "sample_data"})
        self.assertEqual(ok_val, "sample_data")

        with self.assertRaises(ICBucketError) as ctx:
            unwrap_result({"err": "Bucket not found"}, ErrorCode.BUCKET_NOT_FOUND)
        self.assertEqual(ctx.exception.code, ErrorCode.BUCKET_NOT_FOUND)
        self.assertEqual(ctx.exception.message, "Bucket not found")

    def test_client_context_manager_and_files(self):
        with BucketClient(api_key="test_key", bucket_id="my_bucket") as client:
            self.assertIsNotNone(client.files)
            self.assertEqual(
                client.files.url("folder/doc.pdf"),
                f"{CDN_BASE_URL}/cloud/my_bucket/folder/doc.pdf",
            )
            self.assertEqual(client.resolve_bucket_id(), "my_bucket")
            self.assertEqual(client.resolve_bucket_id("other"), "other")

        client_no_bucket = BucketClient(api_key="test_key")
        with self.assertRaises(ICBucketError):
            client_no_bucket.resolve_bucket_id()


if __name__ == "__main__":
    unittest.main()
