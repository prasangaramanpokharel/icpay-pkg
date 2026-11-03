package app.icpay.bucket;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class UrlBuilder {
    private final String bucketId;
    private final String cdnHost;

    public UrlBuilder(String bucketId, String cdnHost) {
        this.bucketId = bucketId.trim();
        String host = cdnHost.trim();
        while (host.endsWith("/")) {
            host = host.substring(0, host.length() - 1);
        }
        this.cdnHost = host;
    }

    public String fileUrl(String path) {
        String cleanPath = path == null ? "" : path.trim();
        while (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }
        String[] parts = cleanPath.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                encoded.append("/");
            }
            encoded.append(URLEncoder.encode(parts[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return cdnHost + "/cloud/" + URLEncoder.encode(bucketId, StandardCharsets.UTF_8).replace("+", "%20") + "/" + encoded;
    }
}
