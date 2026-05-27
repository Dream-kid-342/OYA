import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:url_launcher/url_launcher.dart';

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

class ApplyLoanForm extends StatelessWidget {
  const ApplyLoanForm({super.key});

  Future<void> _launchCall() async {
    final Uri url = Uri.parse('tel:0700000000');
    if (!await launchUrl(url)) {
      debugPrint('Could not launch $url');
    }
  }

  Future<void> _launchReverseCall() async {
    final Uri url = Uri.parse('tel:%230700000000');
    if (!await launchUrl(url)) {
      debugPrint('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
        left: 24,
        right: 24,
        top: 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Apply for a Loan', 
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)
          ),
          const SizedBox(height: 16),
          const Text(
            'We give Working capital (Micro) loans to businessmen and women to expand their existing business.',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.4),
          ),
          const SizedBox(height: 16),
          _buildBullet('No Account Opening'),
          _buildBullet('No savings'),
          _buildBullet('No deposit'),
          _buildBullet('No investment'),
          _buildBullet('No CRB check'),
          _buildBullet('No Hidden Charges'),
          const SizedBox(height: 16),
          const Text(
            'All you need is an Id card and a Business',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen),
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _launchCall,
                  icon: const Icon(Icons.phone),
                  label: const Text('Call Us'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _launchReverseCall,
                  icon: const Icon(Icons.phone_callback),
                  label: const Text('Reverse Call'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildBullet(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 16, color: AppTheme.primaryGreen),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 15)),
        ],
      ),
    );
  }
}
