import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final _fullNameCtrl = TextEditingController();
  final _nationalIdCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _businessNameCtrl = TextEditingController();
  final _businessLocationCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  
  String _businessType = 'RETAIL';
  bool _isLoading = false;

  final List<String> _businessTypes = [
    'RETAIL', 'FOOD', 'TRANSPORT', 'AGRICULTURE', 'SERVICES', 'MANUFACTURING', 'OTHER'
  ];

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _nationalIdCtrl.dispose();
    _phoneCtrl.dispose();
    _businessNameCtrl.dispose();
    _businessLocationCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final repository = ref.read(authRepositoryProvider);
      await repository.register({
        'fullName': _fullNameCtrl.text.trim(),
        'nationalId': _nationalIdCtrl.text.trim(),
        'phoneNumber': _phoneCtrl.text.trim(),
        'businessName': _businessNameCtrl.text.trim(),
        'businessType': _businessType,
        'businessLocation': _businessLocationCtrl.text.trim(),
        'password': _passwordCtrl.text,
        'passwordConfirmation': _confirmPasswordCtrl.text,
      });

      // After register, send OTP for REGISTRATION
      await repository.sendOtp(_phoneCtrl.text.trim(), 'REGISTRATION');
      
      if (mounted) {
        context.push('/otp', extra: _phoneCtrl.text.trim());
      }
    } on DioException catch (e) {
      if (mounted) {
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorRed));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Map<String, dynamic> _validateKenyanId(String id) {
    if (id.isEmpty) {
      return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Required"};
    }
    if (RegExp(r'[^0-9]').hasMatch(id)) {
      return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Contains invalid characters (letters/spaces/symbols)"};
    }
    
    int length = id.length;
    
    if (length <= 7) {
      return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Too short (minimum 8 digits)"};
    }
    if (length == 10 || length == 11 || length == 12 || length == 13) {
      return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Invalid length ($length digits)"};
    }
    if (length >= 15) {
      return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Too long (maximum 14 digits)"};
    }

    if (length == 8) {
      return {"status": "ACCEPTED", "card_type": "8-Digit Normal ID", "reason": "Valid legacy ID."};
    } else if (length == 9) {
      return {"status": "ACCEPTED", "card_type": "9-Digit Maisha ID", "reason": "Valid Maisha Namba."};
    } else if (length == 14) {
      return {"status": "ACCEPTED", "card_type": "14-Digit Maisha UPI", "reason": "Valid Maisha UPI."};
    }

    return {"status": "DENIED", "card_type": "Unknown/Invalid", "reason": "Invalid format"};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Image.asset('assets/images/logo.png', height: 80, errorBuilder: (c, e, s) => const Icon(Icons.business, size: 64, color: AppTheme.primaryGreen)),
              const SizedBox(height: 24),
              const Text(
                'Join OYA Micro-Credit',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              TextFormField(
                controller: _fullNameCtrl,
                decoration: const InputDecoration(labelText: 'Full Name'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _nationalIdCtrl,
                decoration: const InputDecoration(labelText: 'National ID / Maisha Namba'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  final result = _validateKenyanId(v ?? '');
                  if (result['status'] == 'DENIED') {
                    return result['reason'];
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: 'Phone Number (e.g. 07...)'),
                keyboardType: TextInputType.phone,
                validator: (v) => v!.length < 10 ? 'Invalid Phone' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _businessNameCtrl,
                decoration: const InputDecoration(labelText: 'Business Name'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              
              DropdownButtonFormField<String>(
                value: _businessType,
                decoration: const InputDecoration(labelText: 'Business Type'),
                items: _businessTypes.map((type) => DropdownMenuItem(value: type, child: Text(type))).toList(),
                onChanged: (val) => setState(() => _businessType = val!),
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _businessLocationCtrl,
                decoration: const InputDecoration(labelText: 'Business Location'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: (v) => v!.length < 8 ? 'Min 8 chars, 1 upper, 1 lower, 1 num, 1 special' : null,
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _confirmPasswordCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm Password'),
                validator: (v) => v != _passwordCtrl.text ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 32),
              
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Sign Up'),
              ),
              const SizedBox(height: 16),
              
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Already have an account? Log in', style: TextStyle(color: AppTheme.primaryGreen)),
              )
            ],
          ),
        ),
      ),
    );
  }
}
