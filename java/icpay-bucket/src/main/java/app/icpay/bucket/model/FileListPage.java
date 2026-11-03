package app.icpay.bucket.model;

import java.util.Collections;
import java.util.List;

public record FileListPage(
    List<FileMetadata> files,
    long total,
    int page,
    int limit
) {
    public FileListPage {
        if (files == null) {
            files = Collections.emptyList();
        }
    }
}
