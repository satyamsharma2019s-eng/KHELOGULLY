import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The backend's POST /results endpoint REQUIRES a `deviceId` field
/// (used for fraud/audit tracking — see result.schema.js).
/// This generates one persistent ID per install and reuses it forever,
/// stored in secure storage alongside the auth tokens.
class DeviceIdService {
  DeviceIdService._internal();
  static final DeviceIdService instance = DeviceIdService._internal();

  final _storage = const FlutterSecureStorage();
  static const _key = 'device_id';

  Future<String> getOrCreateDeviceId() async {
    final existing = await _storage.read(key: _key);
    if (existing != null) return existing;

    final generated = _generateId();
    await _storage.write(key: _key, value: generated);
    return generated;
  }

  String _generateId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
