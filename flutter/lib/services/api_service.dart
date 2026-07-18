import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Central HTTP wrapper matching the ACTUAL backend contract
/// (confirmed by reading siddharthsharma0337/KHELOGULLY/backend source).
///
/// Response envelope (every endpoint):
///   success -> { success: true, data: {...} }
///   failure -> { success: false, error: { code, message, fields? } }
///
/// TODO: replace with the real deployed URL from Siddharth.
/// Backend default port is 5000, mounted at /api/v1.
class ApiService {
  ApiService._internal();
  static final ApiService instance = ApiService._internal();

  // TODO: Replace with your Railway deployed URL once live, e.g.:
  // static const String baseUrl = 'https://khelogully-backend-production.up.railway.app/api/v1';
  // For local testing use: 'http://10.0.2.2:5000/api/v1' (Android emulator)
  //                     or 'http://localhost:5000/api/v1' (Flutter Web / Windows)
  static const String baseUrl = 'https://khelogully-backend.onrender.com/api/v1';

  final _storage = const FlutterSecureStorage();

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  Map<String, String> _headers(String? token) {
    return {
      'Content-Type': 'application/json',
      'client_type': 'mobile',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Refreshes the access token using the stored refresh token.
  /// Only call this when the error code is specifically TOKEN_EXPIRED —
  /// not for TOKEN_INVALID or UNAUTHORIZED (those mean "log in again").
  Future<bool> _refreshAccessToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return false;

    final response = await http.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: _headers(null),
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final data = decoded['data'];
      await saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
      );
      return true;
    }
    return false;
  }

  /// Extracts the error code from a failed response, e.g. "TOKEN_EXPIRED".
  /// Returns null if the body isn't in the expected error shape.
  String? _errorCode(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      return decoded['error']?['code'];
    } catch (_) {
      return null;
    }
  }

  Future<http.Response> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await getAccessToken();
    final uri = Uri.parse('$baseUrl$path');

    Future<http.Response> send(String? accessToken) {
      final headers = _headers(accessToken);
      switch (method) {
        case 'GET':
          return http.get(uri, headers: headers);
        case 'POST':
          return http.post(uri, headers: headers, body: jsonEncode(body ?? {}));
        case 'DELETE':
          return http.delete(uri, headers: headers);
        default:
          throw Exception('Unsupported method: $method');
      }
    }

    var response = await send(token);

    // Only refresh+retry on TOKEN_EXPIRED specifically.
    // TOKEN_INVALID / UNAUTHORIZED mean the session is truly dead —
    // retrying would just loop forever.
    if (response.statusCode == 401 && _errorCode(response) == 'TOKEN_EXPIRED') {
      final refreshed = await _refreshAccessToken();
      if (refreshed) {
        final newToken = await getAccessToken();
        response = await send(newToken);
      }
    }

    return response;
  }

  Future<http.Response> get(String path) => _request('GET', path);

  Future<http.Response> post(String path, {Map<String, dynamic>? body}) =>
      _request('POST', path, body: body);

  Future<http.Response> delete(String path) => _request('DELETE', path);

  /// Helper: unwraps `{ success, data }` and throws a readable message
  /// on `{ success: false, error: { message } }`.
  dynamic unwrap(http.Response response) {
    final decoded = jsonDecode(response.body);
    if (decoded['success'] == true) {
      return decoded['data'];
    }
    final message = decoded['error']?['message'] ?? 'Unknown error';
    throw ApiException(
      message: message,
      code: decoded['error']?['code'],
      statusCode: response.statusCode,
    );
  }
}

class ApiException implements Exception {
  final String message;
  final String? code;
  final int statusCode;

  ApiException({required this.message, this.code, required this.statusCode});

  @override
  String toString() => message;
}
