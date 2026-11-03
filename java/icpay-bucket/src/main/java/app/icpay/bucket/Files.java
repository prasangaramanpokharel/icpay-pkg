package app.icpay.bucket;

import app.icpay.bucket.error.ErrorCode;
import app.icpay.bucket.error.ICBucketException;
import app.icpay.bucket.model.FileListPage;
import app.icpay.bucket.model.FileMetadata;

import java.net.URLEncoder;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class Files {
    private final HttpTransport transport;
    private final UrlBuilder urlBuilder;
    private final String bucketId;

    public Files(HttpTransport transport, UrlBuilder urlBuilder, String bucketId) {
        this.transport = transport;
        this.urlBuilder = urlBuilder;
        this.bucketId = bucketId;
    }

    public String url(String path) {
        return urlBuilder.fileUrl(path);
    }

    public FileMetadata upload(String path, byte[] data, String contentType, List<String> tags, String visibility) {
        String cleanPath = sanitizePath(path);
        if (cleanPath.isEmpty()) {
            throw new ICBucketException(ErrorCode.INVALID_PATH, "Upload path cannot be empty");
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", contentType != null ? contentType : "application/octet-stream");
        headers.put("x-bucket-id", bucketId);
        headers.put("x-file-path", cleanPath);
        if (visibility != null) {
            headers.put("x-visibility", visibility);
        }
        if (tags != null && !tags.isEmpty()) {
            headers.put("x-file-tags", String.join(",", tags));
        }

        String endpoint = "/api/v1/buckets/" + urlEncode(bucketId) + "/files/" + urlEncode(cleanPath);
        HttpResponse<byte[]> response = transport.sendRaw("PUT", endpoint, headers, data);
        String body = new String(response.body(), StandardCharsets.UTF_8);
        return new FileMetadata(
            cleanPath,
            cleanPath,
            extractFilename(cleanPath),
            data.length,
            contentType != null ? contentType : "application/octet-stream",
            "",
            "",
            urlBuilder.fileUrl(cleanPath),
            tags != null ? tags : Collections.emptyList()
        );
    }

    public byte[] download(String path) {
        String cleanPath = sanitizePath(path);
        String endpoint = "/api/v1/buckets/" + urlEncode(bucketId) + "/files/" + urlEncode(cleanPath);
        HttpResponse<byte[]> response = transport.sendRaw("GET", endpoint, null, null);
        return response.body();
    }

    public boolean exists(String path) {
        String cleanPath = sanitizePath(path);
        try {
            String endpoint = "/api/v1/buckets/" + urlEncode(bucketId) + "/files/" + urlEncode(cleanPath) + "/metadata";
            HttpResponse<byte[]> response = transport.sendRaw("HEAD", endpoint, null, null);
            return response.statusCode() == 200;
        } catch (ICBucketException e) {
            if (e.getCode() == ErrorCode.FILE_NOT_FOUND) {
                return false;
            }
            throw e;
        }
    }

    public void delete(String path) {
        String cleanPath = sanitizePath(path);
        String endpoint = "/api/v1/buckets/" + urlEncode(bucketId) + "/files/" + urlEncode(cleanPath);
        transport.sendRaw("DELETE", endpoint, null, null);
    }

    private String sanitizePath(String path) {
        if (path == null) {
            return "";
        }
        String p = path.trim();
        while (p.startsWith("/")) {
            p = p.substring(1);
        }
        return p;
    }

    private String extractFilename(String path) {
        int idx = path.lastIndexOf('/');
        return idx >= 0 ? path.substring(idx + 1) : path;
    }

    private String urlEncode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
