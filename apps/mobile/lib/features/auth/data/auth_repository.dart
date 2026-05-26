import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  final Dio _dio;
  AuthRepository(this._dio);

  Future<void> register(Map<String, dynamic> data) async {
    await _dio.post('/auth/register', data: data);
  }

  Future<void> sendOtp(String phoneNumber, String purpose) async {
    await _dio.post('/auth/otp/send', data: {
      'phoneNumber': phoneNumber,
      'purpose': purpose,
    });
  }

  Future<void> verifyOtp(String phoneNumber, String otp, String purpose) async {
    await _dio.post('/auth/otp/verify', data: {
      'phoneNumber': phoneNumber,
      'otp': otp,
      'purpose': purpose,
    });
  }

  Future<Map<String, dynamic>> login(String phoneNumber, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'phoneNumber': phoneNumber,
      'password': password,
    });
    
    final data = response.data['data'];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', data['accessToken']);
    
    return data;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
  }
}
