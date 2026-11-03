package app.icpay.bucket;

import app.icpay.bucket.error.ErrorCode;
import app.icpay.bucket.error.ICBucketException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

public final class HttpTransport {
    private final Config config;
    private final HttpClient client;

    public HttpTransport(Config config) {
        this.config = config;
        this.client = HttpClient.newBuilder()
            .connectTimeout(config.timeout())
            .build();
    }

    public HttpResponse<byte[]> sendRaw(String method, String endpoint, Map<String, String> headers, byte[] body) {
        try {
            String base = config.endpoint();
            while (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            String url = base + (endpoint.startsWith("/") ? endpoint : "/" + endpoint);
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(config.timeout())
                .header("Authorization", "Bearer " + config.apiKey())
                .header("x-api-key", config.apiKey());

            if (headers != null) {
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    builder.header(entry.getKey(), entry.getValue());
                }
            }

            HttpRequest.BodyPublisher publisher = body != null ?
                HttpRequest.BodyPublishers.ofByteArray(body) :
                HttpRequest.BodyPublishers.noBody();

            builder.method(method, publisher);
            HttpResponse<byte[]> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());

            int status = response.statusCode();
            if (status >= 400) {
                String errorMsg = new String(response.body());
                ErrorCode code = mapStatusToErrorCode(status, errorMsg);
                throw new ICBucketException(code, errorMsg, status);
            }
            return response;
        } catch (IOException e) {
            throw new ICBucketException(ErrorCode.NETWORK, e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ICBucketException(ErrorCode.INTERNAL, "Request interrupted", e);
        }
    }

    private ErrorCode mapStatusToErrorCode(int status, String body) {
        return switch (status) {
            case 401 -> ErrorCode.AUTHENTICATION_FAILED;
            case 403 -> ErrorCode.PERMISSION_DENIED;
            case 404 -> body.toLowerCase().contains("bucket") ? ErrorCode.BUCKET_NOT_FOUND : ErrorCode.FILE_NOT_FOUND;
            case 400 -> ErrorCode.INVALID_REQUEST;
            case 413 -> ErrorCode.CAPACITY_EXCEEDED;
            case 429 -> ErrorCode.RATE_LIMITED;
            default -> ErrorCode.INTERNAL;
        };
    }
}
