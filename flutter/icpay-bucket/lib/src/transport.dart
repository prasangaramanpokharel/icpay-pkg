import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'error.dart';

class HttpTransport {
  final String apiKey;
  final String endpoint;
  final Duration timeout;
  final http.Client _client;

  HttpTransport({
    required this.apiKey,
    required String endpoint,
    this.timeout = const Duration(seconds: 30),
    http.Client? client,
  })  : endpoint = endpoint.endsWith('/') ? endpoint.substring(0, endpoint.length - 1) : endpoint,
        _client = client ?? http.Client();

  Future<http.Response> send({
    required String method,
    required String path,
    Map<String, String>? headers,
    Uint8List? body,
  }) async {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$endpoint$cleanPath');

    final requestHeaders = <String, String>{
      'Authorization': 'Bearer $apiKey',
      'x-api-key': apiKey,
      ...?headers,
    };

    final request = http.Request(method, uri);
    request.headers.addAll(requestHeaders);
    if (body != null && body.isNotEmpty) {
      request.bodyBytes = body;
    }

    try {
      final streamedResponse = await _client.send(request).timeout(timeout);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode >= 400) {
        final errorMsg = response.body;
        final code = _mapStatusToErrorCode(response.statusCode, errorMsg);
        throw ICBucketException(
          code: code,
          message: errorMsg.isNotEmpty ? errorMsg : 'HTTP ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }

      return response;
    } on ICBucketException {
      rethrow;
    } catch (e) {
      throw ICBucketException(
        code: ErrorCode.network,
        message: e.toString(),
      );
    }
  }

  void close() {
    _client.close();
  }

  ErrorCode _mapStatusToErrorCode(int status, String body) {
    switch (status) {
      case 401:
        return ErrorCode.authenticationFailed;
      case 403:
        return ErrorCode.permissionDenied;
      case 404:
        return body.toLowerCase().contains('bucket') ? ErrorCode.bucketNotFound : ErrorCode.fileNotFound;
      case 400:
        return ErrorCode.invalidRequest;
      case 413:
        return ErrorCode.capacityExceeded;
      case 429:
        return ErrorCode.rateLimited;
      default:
        return ErrorCode.internal;
    }
  }
}
