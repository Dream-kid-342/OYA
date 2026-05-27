import { z } from 'zod';

// ─── Registration ─────────────────────────────────────────
export const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name must contain only letters and spaces'),
  nationalId: z
    .string()
    .regex(/^\d{7,8}$/, 'National ID must be 7 or 8 digits'),
  phoneNumber: z.string().min(10, 'Invalid phone number'),
  businessName: z.string().min(2).max(100),
  businessType: z.enum([
    'RETAIL', 'FOOD', 'TRANSPORT', 'AGRICULTURE',
    'SERVICES', 'MANUFACTURING', 'OTHER',
  ]),
  businessLocation: z.string().min(2).max(100),
  businessDescription: z.string().max(500).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Password must contain uppercase, lowercase, digit, and special character (!@#$%^&*)',
    ),
  passwordConfirmation: z.string(),
}).refine((d) => d.password === d.passwordConfirmation, {
  message: 'Passwords do not match',
  path: ['passwordConfirmation'],
});

// ─── OTP Send ────────────────────────────────────────────
export const OtpSendSchema = z.object({
  phoneNumber: z.string().min(10),
  purpose: z.enum(['REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'PASSWORD_RESET']),
});

// ─── OTP Verify ──────────────────────────────────────────
export const OtpVerifySchema = z.object({
  phoneNumber: z.string().min(10),
  otp: z.string().regex(/^\d{6,8}$/, 'OTP must be 6 or 8 digits'),
  purpose: z.enum(['REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'PASSWORD_RESET']),
});

// ─── Login ───────────────────────────────────────────────
export const LoginSchema = z.object({
  phoneNumber: z.string().min(10),
  password: z.string().min(1),
  deviceName: z.string().max(100).optional(),
  deviceOs: z.string().max(50).optional(),
  appVersion: z.string().max(20).optional(),
  deviceFingerprint: z.string().max(64).optional(),
});

// ─── Refresh Token ────────────────────────────────────────
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // may come from cookie
});

// ─── Change Password ─────────────────────────────────────
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/),
  newPasswordConfirmation: z.string(),
}).refine((d) => d.newPassword === d.newPasswordConfirmation, {
  message: 'Passwords do not match',
  path: ['newPasswordConfirmation'],
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type OtpSendInput = z.infer<typeof OtpSendSchema>;
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
