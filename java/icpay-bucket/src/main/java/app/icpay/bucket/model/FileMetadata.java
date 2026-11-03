package app.icpay.bucket.model;

import java.util.Collections;
import java.util.List;

public record FileMetadata(
    String id,
    String path,
    String name,
    long size,
    String contentType,
    String createdAt,
    String updatedAt,
    String url,
    List<String> tags
) {
    public FileMetadata {
        if (tags == null) {
            tags = Collections.emptyList();
        }
    }
}
