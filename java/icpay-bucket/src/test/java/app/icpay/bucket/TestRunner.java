package app.icpay.bucket;

import app.icpay.bucket.error.ErrorCode;
import app.icpay.bucket.error.ICBucketException;

public class TestRunner {
    public static void main(String[] args) {
        int passed = 0;

        Client client = new Client("test_key", "my-bucket");
        if (client.files == null) throw new AssertionError("files should not be null");
        passed++;
        System.out.println("PASS: testClientInitialization");

        try {
            new Client("", "my-bucket");
            throw new AssertionError("Should throw on empty key");
        } catch (ICBucketException e) {
            if (e.getCode() != ErrorCode.AUTHENTICATION_FAILED) throw new AssertionError("Wrong code: " + e.getCode());
            passed++;
            System.out.println("PASS: testEmptyApiKeyThrows");
        }

        try {
            new Client("key", "  ");
            throw new AssertionError("Should throw on empty bucket");
        } catch (ICBucketException e) {
            if (e.getCode() != ErrorCode.INVALID_REQUEST) throw new AssertionError("Wrong code: " + e.getCode());
            passed++;
            System.out.println("PASS: testEmptyBucketIdThrows");
        }

        String url = client.files.url("/photos/avatar.png");
        if (!url.equals("https://cloud.icpay.app/cloud/my-bucket/photos/avatar.png")) {
            throw new AssertionError("Unexpected url: " + url);
        }
        passed++;
        System.out.println("PASS: testUrlGeneration");

        System.out.println("\nAll Java SDK tests passed: " + passed + "/4");
    }
}
