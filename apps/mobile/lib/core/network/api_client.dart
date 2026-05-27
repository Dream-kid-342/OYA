import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'http://192.168.100.35:3000', // Physical Device IP
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
    onError: (DioException e, handler) async {
      if (e.response?.statusCode == 403 && e.response?.data?['message'] == 'ACCOUNT_TERMINATED') {
        ref.read(authProvider.notifier).markTerminated();
      }
      return handler.next(e);
    },
  ));

  return dio;
});
