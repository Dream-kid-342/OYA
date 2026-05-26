import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

class LoansScreen extends ConsumerStatefulWidget {
  const LoansScreen({super.key});

  @override
  ConsumerState<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends ConsumerState<LoansScreen> {
  void _showApplyLoanModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return const ApplyLoanForm();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Loans')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              onPressed: () {
                HapticFeedback.selectionClick();
                _showApplyLoanModal();
              },
              icon: const Icon(Icons.add),
              label: const Text('Apply for New Loan'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentGold,
                foregroundColor: AppTheme.primaryGreen,
              ),
            ),
            const SizedBox(height: 32),
            const Text('Active Loans', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const CircleAvatar(backgroundColor: AppTheme.primaryGreen, child: Icon(Icons.monetization_on, color: AppTheme.accentGold)),
                title: const Text('Working Capital Loan'),
                subtitle: const Text('Disbursed • Due in 14 days'),
                trailing: const Text('KES 50,000', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryGreen)),
                onTap: () {},
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ApplyLoanForm extends ConsumerStatefulWidget {
  const ApplyLoanForm({super.key});

  @override
  ConsumerState<ApplyLoanForm> createState() => _ApplyLoanFormState();
}

class _ApplyLoanFormState extends ConsumerState<ApplyLoanForm> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _weeksController = TextEditingController();
  bool _isLoading = false;

  Future<void> _submitLoan() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final dio = ref.read(apiClientProvider);
      final user = ref.read(authProvider).user;
      
      if (user == null) throw 'User not authenticated';

      final response = await dio.post('/api/v1/loans/apply', data: {
        'userId': user['id'],
        'principalAmount': double.parse(_amountController.text.trim()),
        'numberOfWeeks': int.parse(_weeksController.text.trim()),
        'purpose': 'WORKING_CAPITAL',
      });

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Loan applied successfully! Ref: ${response.data['referenceNumber']}'), backgroundColor: AppTheme.successGreen),
        );
        HapticFeedback.mediumImpact();
      }
    } catch (e) {
      String errorMessage = 'An error occurred';
      if (e is num || e is String) {
          errorMessage = e.toString();
      } else if (e is DioException) {
        if (e.response != null && e.response?.data != null) {
          if (e.response?.data is Map && e.response?.data['message'] != null) {
            errorMessage = e.response?.data['message'];
          } else {
            errorMessage = e.response?.data.toString() ?? 'Server error';
          }
        } else {
          errorMessage = e.message ?? 'Network error';
        }
      } else {
        errorMessage = e.toString();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage), backgroundColor: AppTheme.errorRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 32,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Apply for a Loan', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            TextFormField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount (KES)', prefixIcon: Icon(Icons.attach_money)),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _weeksController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Duration (Weeks)', prefixIcon: Icon(Icons.calendar_today)),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 32),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _submitLoan,
                    child: const Text('Submit Application'),
                  ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
