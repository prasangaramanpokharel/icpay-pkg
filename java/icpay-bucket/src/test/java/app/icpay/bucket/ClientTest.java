package app.icpay.bucket;

import app.icpay.bucket.error.ErrorCode;
import app.icpay.bucket.error.ICBucketException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class ClientTest {

    @Test
    public void testClientInitialization() {
        Client client = new Client("test_key", "my-bucket");
        assertNotNull(client.files);
    }

    @Test
    public void testEmptyApiKeyThrows() {
        ICBucketException ex = assertThrows(ICBucketException.class, () -> new Client("", "my-bucket"));
        assertEquals(ErrorCode.AUTHENTICATION_FAILED, ex.getCode());
    }

    @Test
    public void testEmptyBucketIdThrows() {
        ICBucketException ex = assertThrows(ICBucketException.class, () -> new Client("key", "  "));
        assertEquals(ErrorCode.INVALID_REQUEST, ex.getCode());
    }

    @Test
    public void testUrlGeneration() {
        Client client = new Client("test_key", "my-bucket", "https://api.icpay.app", "https://cloud.icpay.app", null);
        String url = client.files.url("/photos/avatar.png");
        assertEquals("https://cloud.icpay.app/cloud/my-bucket/photos/avatar.png", url);
    }

    public static void main(String[] args) {
        ClientTest test = new ClientTest();
        test.testClientInitialization();
        test.testEmptyApiKeyThrows();
        test.testEmptyBucketIdThrows();
        test.testUrlGeneration();
        System.out.println("Java unit tests passed (4/4)");
    }
}
