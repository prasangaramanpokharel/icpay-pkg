package app.icpay.bucket;

import app.icpay.bucket.error.ErrorCode;
import app.icpay.bucket.error.ICBucketException;
import app.icpay.bucket.model.BucketUsage;

import java.time.Duration;

public final class Client {
    public final Files files;
    private final HttpTransport transport;
    private final Config config;

    public Client(String apiKey, String bucketId) {
        this(apiKey, bucketId, "https://api.icpay.app", "https://cloud.icpay.app", Duration.ofSeconds(30));
    }

    public Client(String apiKey, String bucketId, String endpoint, String cdnHost, Duration timeout) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new ICBucketException(ErrorCode.AUTHENTICATION_FAILED, "apiKey is required");
        }
        if (bucketId == null || bucketId.trim().isEmpty()) {
            throw new ICBucketException(ErrorCode.INVALID_REQUEST, "bucketId is required");
        }

        this.config = new Config(apiKey.trim(), bucketId.trim(), endpoint, cdnHost, timeout);
        this.transport = new HttpTransport(this.config);
        UrlBuilder urlBuilder = new UrlBuilder(config.bucketId(), config.cdnHost());
        this.files = new Files(this.transport, urlBuilder, config.bucketId());
    }

    public BucketUsage usage() {
        return new BucketUsage(0, 0, 0, 0);
    }
}
