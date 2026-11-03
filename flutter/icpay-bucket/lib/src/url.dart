class UrlBuilder {
  final String bucketId;
  final String cdnHost;

  UrlBuilder({
    required this.bucketId,
    required String cdnHost,
  }) : cdnHost = cdnHost.endsWith('/') ? cdnHost.substring(0, cdnHost.length - 1) : cdnHost;

  String fileUrl(String path) {
    var cleanPath = path.trim();
    while (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    final encodedSegments = cleanPath
        .split('/')
        .map(Uri.encodeComponent)
        .join('/');
    final encodedBucket = Uri.encodeComponent(bucketId);
    return '$cdnHost/cloud/$encodedBucket/$encodedSegments';
  }
}
