import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

class TerminatedScreen extends StatelessWidget {
  const TerminatedScreen({super.key});

  Future<void> _launchPhone() async {
    final Uri url = Uri.parse('tel:+254700000000');
    if (!await launchUrl(url)) {
      debugPrint('Could not launch $url');
    }
  }

  Future<void> _launchEmail() async {
    final Uri url = Uri.parse('mailto:support@oya.com?subject=Account%20Termination%20Appeal');
    if (!await launchUrl(url)) {
      debugPrint('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.gavel_rounded,
                size: 80,
                color: Colors.redAccent,
              ),
              const SizedBox(height: 24),
              Text(
                'Account Terminated',
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Your account has been terminated and you can no longer use the Oya app. If you believe this is a mistake or need further details, please contact our support team.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  color: AppTheme.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 48),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _ContactButton(
                    icon: Icons.phone,
                    label: 'Call Us',
                    onTap: _launchPhone,
                  ),
                  const SizedBox(width: 24),
                  _ContactButton(
                    icon: Icons.email,
                    label: 'Email Us',
                    onTap: _launchEmail,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ContactButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.primaryGreen.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.primaryGreen.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppTheme.primaryGreen, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryGreen,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
