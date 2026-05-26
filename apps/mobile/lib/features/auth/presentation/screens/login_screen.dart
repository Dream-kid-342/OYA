import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  void _login() async {
    if (_phoneCtrl.text.isEmpty || _passCtrl.text.isEmpty) return;
    try {
      await ref.read(authProvider.notifier).login(_phoneCtrl.text, _passCtrl.text);
      // Router will automatically redirect to /dashboard because auth state changed to authenticated
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login Failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),
              Image.asset('assets/images/logo.png', height: 100, errorBuilder: (c, e, s) => const Icon(Icons.business, size: 80, color: AppTheme.primaryGreen)),
              const SizedBox(height: 48),
              const Text(
                'Welcome Back',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: 'Phone Number'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: authState.isLoading ? null : _login,
                child: authState.isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Login'),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => context.push('/register'),
                child: const Text('New here? Create an account', style: TextStyle(color: AppTheme.primaryGreen)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
