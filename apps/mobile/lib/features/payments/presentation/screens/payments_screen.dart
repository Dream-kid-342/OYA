import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/network/api_client.dart';

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  final _amountController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _processPayment() async {
    final amount = double.tryParse(_amountController.text.trim());
    final phone = _phoneController.text.trim();

    if (amount == null || amount <= 0 || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount and phone number')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post('/payments/initiate', data: {
        // Provide a dummy UUID for the prototype if loanId isn't available yet
        'loanId': '123e4567-e89b-12d3-a456-426614174000',
        'phoneNumber': phone,
        'amount': amount,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.data['message'] ?? 'Payment initiated successfully. Please check your phone for the STK push.'),
            backgroundColor: AppTheme.successGreen,
          ),
        );
        _amountController.clear();
        _phoneController.clear();
      }
    } on DioException catch (e) {
      if (mounted) {
        final message = e.response?.data?['message'] ?? 'Failed to initiate payment';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payments')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Make a Repayment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    TextField(
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number (e.g. 254700000000)',
                        prefixIcon: Icon(Icons.phone),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _amountController,
                      decoration: const InputDecoration(
                        labelText: 'Amount (KES)',
                        prefixIcon: Icon(Icons.money),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.successGreen,
                        minimumSize: const Size(double.infinity, 50)
                      ),
                      onPressed: _isLoading ? null : _processPayment,
                      child: _isLoading 
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Pay via M-PESA'),
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Text('Payment History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.check_circle, color: AppTheme.successGreen),
                    title: const Text('Repayment - M-PESA'),
                    subtitle: const Text('May 20, 2026'),
                    trailing: const Text('KES 10,000', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.check_circle, color: AppTheme.successGreen),
                    title: const Text('Repayment - M-PESA'),
                    subtitle: const Text('April 20, 2026'),
                    trailing: const Text('KES 10,000', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
