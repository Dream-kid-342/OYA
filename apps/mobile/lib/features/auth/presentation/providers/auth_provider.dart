import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final bool isTerminated;
  final Map<String, dynamic>? user;
  final String? error;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.isTerminated = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    bool? isTerminated,
    Map<String, dynamic>? user,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isTerminated: isTerminated ?? this.isTerminated,
      user: user ?? this.user,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  late AuthRepository _repository;

  @override
  AuthState build() {
    _repository = ref.watch(authRepositoryProvider);
    _init();
    return AuthState(isLoading: true);
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    if (token != null) {
      state = state.copyWith(isLoading: false, isAuthenticated: true);
    } else {
      state = state.copyWith(isLoading: false, isAuthenticated: false);
    }
  }

  Future<void> login(String phone, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repository.login(phone, password);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: data['user'],
      );
    } on DioException catch (e) {
      String errorMessage = 'An error occurred';
      if (e.response != null && e.response?.data != null) {
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          errorMessage = e.response?.data['message'];
          if (e.response?.data['details'] != null) {
            errorMessage += ': ${e.response?.data['details']}';
          }
        } else {
          errorMessage = e.response?.data.toString() ?? 'Server error';
        }
      } else {
        errorMessage = e.message ?? 'Network error';
      }
      
      if (errorMessage == 'ACCOUNT_TERMINATED') {
        state = state.copyWith(isLoading: false, isTerminated: true);
        throw errorMessage;
      }

      state = state.copyWith(
        isLoading: false,
        error: errorMessage,
      );
      throw errorMessage;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      throw e.toString();
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _repository.logout();
    state = state.copyWith(isLoading: false, isAuthenticated: false, user: null);
  }

  void markTerminated() {
    state = state.copyWith(isTerminated: true, isAuthenticated: false, isLoading: false);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
