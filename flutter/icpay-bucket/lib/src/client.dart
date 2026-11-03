import 'error.dart';
import 'files.dart';
import 'transport.dart';
import 'types.dart';
import 'url.dart';

class ICBucketClient {
  final FileOperations files;
  final HttpTransport _transport;
  final String bucketId;

  ICBucketClient({
    required String apiKey,
    required this.bucketId,
    String endpoint = 'https://api.icpay.app',
    String cdnHost = 'https://cloud.icpay.app',
    Duration timeout = const Duration(seconds: 30),
  })  : _transport = HttpTransport(
          apiKey: apiKey.trim(),
          endpoint: endpoint,
          timeout: timeout,
        ),
        files = FileOperations(
          transport: HttpTransport(
            apiKey: apiKey.trim(),
            endpoint: endpoint,
            timeout: timeout,
          ),
          urlBuilder: UrlBuilder(
            bucketId: bucketId.trim(),
            cdnHost: cdnHost,
          ),
          bucketId: bucketId.trim(),
        ) {
    if (apiKey.trim().isEmpty) {
      throw const ICBucketException(
        code: ErrorCode.authenticationFailed,
        message: 'apiKey is required',
      );
    }
    if (bucketId.trim().isEmpty) {
      throw const ICBucketException(
        code: ErrorCode.invalidRequest,
        message: 'bucketId is required',
      );
    }
  }

  Future<BucketUsage> usage() async {
    final endpoint = '/api/v1/buckets/${Uri.encodeComponent(bucketId)}/usage';
    final response = await _transport.send(
      method: 'GET',
      path: endpoint,
    );
    return BucketUsage.fromJson({});
  }

  void close() {
    _transport.close();
  }
}
