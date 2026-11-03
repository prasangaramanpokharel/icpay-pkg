package app.icpay.bucket.model;

public record BucketUsage(
    long usedBytes,
    long capacityBytes,
    long remainingBytes,
    long fileCount
) {
}
