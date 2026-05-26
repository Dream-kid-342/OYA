import AfricasTalking from 'africastalking';

const AT = AfricasTalking({
  apiKey: process.env.AT_API_KEY || '',
  username: process.env.AT_USERNAME || 'sandbox',
});

const sms = AT.SMS;

/**
 * Send an SMS via Africa's Talking.
 */
export async function sendSms(to: string | string[], message: string): Promise<boolean> {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    await sms.send({
      to: recipients,
      message,
      from: process.env.AT_SENDER_ID || 'OYA',
    });
    return true;
  } catch (err) {
    console.error('[SMS] Delivery failed:', err);
    return false;
  }
}

/**
 * Send OTP SMS.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const message = `Your OYA verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
  return sendSms(phone, message);
}

/**
 * Format notification message for SMS (keep under 160 chars).
 */
export function formatSmsMessage(title: string, body: string): string {
  const full = `OYA: ${title} - ${body}`;
  return full.length > 160 ? full.slice(0, 157) + '...' : full;
}
