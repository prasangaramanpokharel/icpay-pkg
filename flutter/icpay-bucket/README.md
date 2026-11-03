# icpay_bucket (Flutter / Dart)

Official Flutter & Dart SDK for ICPay Cloud / icBucket decentralized storage on the Internet Computer.

## Requirements

- Dart SDK 3.0.0 or later
- Flutter 3.10.0 or later

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  icpay_bucket: ^1.0.0
```

Run:

```bash
dart pub get
```

## Quickstart

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:icpay_bucket/icpay_bucket.dart';

void main() async {
  final client = ICBucketClient(
    apiKey: 'YOUR_API_KEY',
    bucketId: 'my-bucket',
  );

  final content = Uint8List.fromList(utf8.encode('Hello ICPay Cloud'));

  final uploaded = await client.files.upload(
    path: '/documents/notes.txt',
    data: content,
    contentType: 'text/plain',
  );

  print('File uploaded: ${uploaded.url}');

  final downloaded = await client.files.download('/documents/notes.txt');
  print('Downloaded bytes: ${downloaded.length}');

  final exists = await client.files.exists('/documents/notes.txt');
  print('Exists: $exists');

  await client.files.delete('/documents/notes.txt');

  client.close();
}
```

## CDN URL Generation

```dart
final publicUrl = client.files.url('/photos/nature.png');
```

## License

MIT
