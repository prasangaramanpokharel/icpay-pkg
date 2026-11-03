enum ErrorCode {
  authenticationFailed,
  permissionDenied,
  bucketNotFound,
  fileNotFound,
  invalidPath,
  invalidRequest,
  capacityExceeded,
  bucketExpired,
  uploadFailed,
  chunkFailed,
  rateLimited,
  network,
  internal,
}

class ICBucketException implements Exception {
  final ErrorCode code;
  final String message;
  final int statusCode;

  const ICBucketException({
    required this.code,
    required this.message,
    this.statusCode = 0,
  });

  @override
  String toString() => 'ICBucketException($code): $message (status: $statusCode)';
}
