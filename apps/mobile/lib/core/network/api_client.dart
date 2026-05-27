import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

// Create a globally accessible provider for the cookie jar
final cookieJarProvider = Provider<PersistCookieJar>((ref) {
  throw UnimplementedError('cookieJarProvider must be overridden in main.dart');
});

final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'http://192.168.100.35:3000', // Physical Device IP
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  final cookieJar = ref.watch(cookieJarProvider);
  dio.interceptors.add(CookieManager(cookieJar));

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
