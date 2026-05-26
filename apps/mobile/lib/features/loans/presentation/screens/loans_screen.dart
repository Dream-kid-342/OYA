import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

class LoansScreen extends StatelessWidget {
  const LoansScreen({super.key});

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
              onPressed: () {},
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
            const SizedBox(height: 32),
            const Text('Past Loans', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const CircleAvatar(backgroundColor: Colors.grey, child: Icon(Icons.check, color: Colors.white)),
                title: const Text('Equipment Financing'),
                subtitle: const Text('Closed'),
                trailing: const Text('KES 120,000', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
