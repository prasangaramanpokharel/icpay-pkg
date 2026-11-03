class FileMetadata {
  final String id;
  final String path;
  final String name;
  final int size;
  final String contentType;
  final String createdAt;
  final String updatedAt;
  final String url;
  final List<String> tags;

  const FileMetadata({
    required this.id,
    required this.path,
    required this.name,
    required this.size,
    required this.contentType,
    required this.createdAt,
    required this.updatedAt,
    required this.url,
    this.tags = const [],
  });

  factory FileMetadata.fromJson(Map<String, dynamic> json) {
    return FileMetadata(
      id: json['id'] as String? ?? '',
      path: json['path'] as String? ?? '',
      name: json['name'] as String? ?? '',
      size: (json['size'] as num?)?.toInt() ?? 0,
      contentType: json['contentType'] as String? ?? 'application/octet-stream',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      url: json['url'] as String? ?? '',
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'path': path,
    'name': name,
    'size': size,
    'contentType': contentType,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'url': url,
    'tags': tags,
  };
}

class FileListPage {
  final List<FileMetadata> files;
  final int total;
  final int page;
  final int limit;

  const FileListPage({
    required this.files,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory FileListPage.fromJson(Map<String, dynamic> json) {
    final list = (json['files'] as List<dynamic>?)
            ?.map((e) => FileMetadata.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [];
    return FileListPage(
      files: list,
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
    );
  }
}

class BucketUsage {
  final int usedBytes;
  final int capacityBytes;
  final int remainingBytes;
  final int fileCount;

  const BucketUsage({
    required this.usedBytes,
    required this.capacityBytes,
    required this.remainingBytes,
    required this.fileCount,
  });

  factory BucketUsage.fromJson(Map<String, dynamic> json) {
    return BucketUsage(
      usedBytes: (json['usedBytes'] as num?)?.toInt() ?? 0,
      capacityBytes: (json['capacityBytes'] as num?)?.toInt() ?? 0,
      remainingBytes: (json['remainingBytes'] as num?)?.toInt() ?? 0,
      fileCount: (json['fileCount'] as num?)?.toInt() ?? 0,
    );
  }
}
