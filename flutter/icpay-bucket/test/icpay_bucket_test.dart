import 'package:icpay_bucket/icpay_bucket.dart';
import 'package:test/test.dart';

void main() {
  group('ICBucketClient', () {
    test('initializes correctly with valid parameters', () {
      final client = ICBucketClient(
        apiKey: 'test_key',
        bucketId: 'my-bucket',
      );
      expect(client.files, isNotNull);
      expect(client.bucketId, equals('my-bucket'));
    });

    test('throws ICBucketException when apiKey is empty', () {
      expect(
        () => ICBucketClient(apiKey: '', bucketId: 'my-bucket'),
        throwsA(
          isA<ICBucketException>().having(
            (e) => e.code,
            'code',
            equals(ErrorCode.authenticationFailed),
          ),
        ),
      );
    });

    test('throws ICBucketException when bucketId is empty', () {
      expect(
        () => ICBucketClient(apiKey: 'key', bucketId: '   '),
        throwsA(
          isA<ICBucketException>().having(
            (e) => e.code,
            'code',
            equals(ErrorCode.invalidRequest),
          ),
        ),
      );
    });

    test('generates public file URL correctly', () {
      final client = ICBucketClient(
        apiKey: 'test_key',
        bucketId: 'my-bucket',
        cdnHost: 'https://cloud.icpay.app',
      );
      final url = client.files.url('/photos/nature.png');
      expect(url, equals('https://cloud.icpay.app/cloud/my-bucket/photos/nature.png'));
    });
  });
}
