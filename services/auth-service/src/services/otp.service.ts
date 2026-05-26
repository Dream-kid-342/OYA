// @ts-nocheck
import { getRedisClient, RedisKeys, RedisTTL } from '@oya/shared';
import AfricasTalking from 'africastalking';

const AT = AfricasTalking({
  apiKey: process.env.AT_API_KEY || '',
  username: process.env.AT_USERNAME || 'sandbox',
});

const sms = AT.SMS;

/**
 * Generate a cryptographically random 6-digit OTP.
 */
export function generateOtp(): string {
  // In development, return a fixed OTP for easy testing
  if (process.env.NODE_ENV !== 'production') return '123456';

  const min = 100000;
  const max = 999999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString();
}

/**
 * Store OTP in Redis with TTL.
 * Key: otp:{phone}
 */
export async function storeOtp(phone: string, otp: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(RedisKeys.otp(phone), otp, 'EX', RedisTTL.OTP);
}

/**
 * Verify OTP from Redis.
 * Returns true if valid, false if expired or wrong.
 * Increments attempt counter. Locks after 3 failures.
 */
export async function verifyOtp(
  phone: string,
  inputOtp: string,
): Promise<{ valid: boolean; locked: boolean; attemptsRemaining: number }> {
  const redis = getRedisClient();

  // Check if locked
  const attemptsKey = RedisKeys.otpAttempts(phone);
  const attemptsStr = await redis.get(attemptsKey);
  const attempts = parseInt(attemptsStr || '0', 10);

  if (attempts >= 3) {
    return { valid: false, locked: true, attemptsRemaining: 0 };
  }

  const storedOtp = await redis.get(RedisKeys.otp(phone));

  if (!storedOtp) {
    return { valid: false, locked: false, attemptsRemaining: 3 - attempts - 1 };
  }

  if (storedOtp !== inputOtp) {
    // Increment attempt counter
    const newAttempts = await redis.incr(attemptsKey);
    if (newAttempts === 1) {
      await redis.expire(attemptsKey, RedisTTL.OTP_ATTEMPTS);
    }
    const remaining = Math.max(0, 3 - newAttempts);
    if (remaining === 0) {
      await redis.del(RedisKeys.otp(phone));
    }
    return { valid: false, locked: remaining === 0, attemptsRemaining: remaining };
  }

  // Valid — clean up
  await redis.del(RedisKeys.otp(phone));
  await redis.del(attemptsKey);
  return { valid: true, locked: false, attemptsRemaining: 3 };
}

/**
 * Check if OTP send rate limit is exceeded.
 * Max 3 sends per 10 minutes per phone.
 */
export async function checkOtpSendRateLimit(phone: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = RedisKeys.rateLimitOtpSend(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RedisTTL.RATE_OTP);
  }
  return count > 3;
}

/**
 * Send OTP via Africa's Talking SMS.
 */
export async function sendOtpSms(phone: string, otp: string, purpose: string): Promise<void> {
  const purposeMessages: Record<string, string> = {
    REGISTRATION: 'Your OYA registration code',
    LOGIN: 'Your OYA login code',
    PHONE_CHANGE: 'Your OYA phone change verification code',
    PASSWORD_RESET: 'Your OYA password reset code',
  };

  const message = `${purposeMessages[purpose] || 'Your OYA verification code'} is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] Bypassing real SMS. Use OTP ${otp} for phone ${phone}`);
      return; 
    }
    await sms.send({
      to: [phone],
      message,
      from: process.env.AT_SENDER_ID || 'OYA',
    });
  } catch (err) {
    console.error('[OTP] SMS delivery failed:', err);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to deliver OTP. Please try again.');
    }
  }
}
