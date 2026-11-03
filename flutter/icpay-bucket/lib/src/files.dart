import 'dart:convert';
import 'dart:typed_data';
import 'error.dart';
import 'transport.dart';
import 'types.dart';
import 'url.dart';

class FileOperations {
  final HttpTransport _transport;
  final UrlBuilder _urlBuilder;
  final String _bucketId;

  FileOperations({
    required HttpTransport transport,
    required UrlBuilder urlBuilder,
    required String bucketId,
  })  : _transport = transport,
        _urlBuilder = urlBuilder,
        _bucketId = bucketId;

  String url(String path) => _urlBuilder.fileUrl(path);

  Future<FileMetadata> upload({
    required String path,
    required Uint8List data,
    String contentType = 'application/octet-stream',
    List<String> tags = const [],
    String? visibility,
  }) async {
    final cleanPath = _sanitizePath(path);
    if (cleanPath.isEmpty) {
      throw const ICBucketException(
        code: ErrorCode.invalidPath,
        message: 'Upload path cannot be empty',
      );
    }

    final headers = <String, String>{
      'Content-Type': contentType,
      'x-bucket-id': _bucketId,
      'x-file-path': cleanPath,
    };

    if (visibility != null) {
      headers['x-visibility'] = visibility;
    }

    if (tags.isNotEmpty) {
      headers['x-file-tags'] = tags.join(',');
    }

    final endpoint = '/api/v1/buckets/${Uri.encodeComponent(_bucketId)}/files/${Uri.encodeComponent(cleanPath)}';
    final response = await _transport.send(
      method: 'PUT',
      path: endpoint,
      headers: headers,
      body: data,
    );

    return FileMetadata(
      id: cleanPath,
      path: cleanPath,
      name: _extractFilename(cleanPath),
      size: data.length,
      contentType: contentType,
      createdAt: DateTime.now().toIso8601String(),
      updatedAt: DateTime.now().toIso8601String(),
      url: _urlBuilder.fileUrl(cleanPath),
      tags: tags,
    );
  }

  Future<Uint8List> download(String path) async {
    final cleanPath = _sanitizePath(path);
    final endpoint = '/api/v1/buckets/${Uri.encodeComponent(_bucketId)}/files/${Uri.encodeComponent(cleanPath)}';
    final response = await _transport.send(
      method: 'GET',
      path: endpoint,
    );
    return response.bodyBytes;
  }

  Future<bool> exists(String path) async {
    final cleanPath = _sanitizePath(path);
    try {
      final endpoint = '/api/v1/buckets/${Uri.encodeComponent(_bucketId)}/files/${Uri.encodeComponent(cleanPath)}/metadata';
      final response = await _transport.send(
        method: 'HEAD',
        path: endpoint,
      );
      return response.statusCode == 200;
    } on ICBucketException catch (e) {
      if (e.code == ErrorCode.fileNotFound) {
        return false;
      }
      rethrow;
    }
  }

  Future<void> delete(String path) async {
    final cleanPath = _sanitizePath(path);
    final endpoint = '/api/v1/buckets/${Uri.encodeComponent(_bucketId)}/files/${Uri.encodeComponent(cleanPath)}';
    await _transport.send(
      method: 'DELETE',
      path: endpoint,
    );
  }

  String _sanitizePath(String path) {
    var p = path.trim();
    while (p.startsWith('/')) {
      p = p.substring(1);
    }
    return p;
  }

  String _extractFilename(String path) {
    final idx = path.lastIndexOf('/');
    return idx >= 0 ? path.substring(idx + 1) : path;
  }
}
