package app.icpay.bucket;

import java.time.Duration;

public record Config(
    String apiKey,
    String bucketId,
    String endpoint,
    String cdnHost,
    Duration timeout
) {
    public Config {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("apiKey is required");
        }
        if (bucketId == null || bucketId.trim().isEmpty()) {
            throw new IllegalArgumentException("bucketId is required");
        }
        if (endpoint == null || endpoint.trim().isEmpty()) {
            endpoint = "https://api.icpay.app";
        }
        if (cdnHost == null || cdnHost.trim().isEmpty()) {
            cdnHost = "https://cloud.icpay.app";
        }
        if (timeout == null) {
            timeout = Duration.ofSeconds(30);
        }
    }
}
