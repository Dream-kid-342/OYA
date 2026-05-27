import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:mobile/features/auth/presentation/screens/splash_screen.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_screen.dart';
import 'package:mobile/features/auth/presentation/screens/otp_screen.dart';
import 'package:mobile/features/auth/presentation/screens/terminated_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:mobile/features/loans/presentation/screens/loans_screen.dart';
import 'package:mobile/features/payments/presentation/screens/payments_screen.dart';
import 'package:mobile/features/profile/presentation/screens/profile_screen.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/core/theme/app_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      if (authState.isLoading) return null; // Don't redirect while checking auth

      if (authState.isTerminated && state.uri.path != '/terminated') {
        return '/terminated';
      }
      if (state.uri.path == '/terminated' && !authState.isTerminated) {
        return '/splash';
      }

      final isAuthRoute = state.uri.path == '/login' || state.uri.path == '/register' || state.uri.path == '/otp' || state.uri.path == '/splash';
      
      if (!authState.isAuthenticated && !isAuthRoute && state.uri.path != '/terminated') {
        return '/login';
      }
      
      if (authState.isAuthenticated && isAuthRoute) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/terminated',
        builder: (context, state) => const TerminatedScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/otp',
        builder: (context, state) {
          final phone = state.extra as String? ?? '';
          return OtpScreen(phoneNumber: phone);
        },
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/loans', builder: (_, __) => const LoansScreen()),
          GoRoute(path: '/payments', builder: (_, __) => const PaymentsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});

class MainShell extends StatefulWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  final _tabs = ['/dashboard', '/loans', '/payments', '/profile'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) {
          setState(() => _currentIndex = i);
          context.go(_tabs[i]);
        },
        indicatorColor: AppTheme.accentGold.withValues(alpha: 0.3),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppTheme.primaryGreen),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.monetization_on_outlined),
            selectedIcon: Icon(Icons.monetization_on, color: AppTheme.primaryGreen),
            label: 'Loans',
          ),
          NavigationDestination(
            icon: Icon(Icons.payment_outlined),
            selectedIcon: Icon(Icons.payment, color: AppTheme.primaryGreen),
            label: 'Pay',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppTheme.primaryGreen),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
