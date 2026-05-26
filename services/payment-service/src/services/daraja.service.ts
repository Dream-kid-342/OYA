import axios from 'axios';
import crypto from 'crypto';

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

function getBase(): string {
  return process.env.DARAJA_ENV === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

/**
 * Get Daraja OAuth access token.
 * Cached in memory for 55 minutes (token expires at 60 min).
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getDarajaToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const credentials = Buffer.from(
    `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`,
  ).toString('base64');

  const response = await axios.get(
    `${getBase()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 15000,
    },
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutes

  return cachedToken!;
}

/**
 * Generate Daraja STK Push password.
 * Base64(ShortCode + Passkey + Timestamp)
 */
export function generateStkPassword(timestamp: string): string {
  const shortCode = process.env.DARAJA_BUSINESS_SHORT_CODE!;
  const passkey = process.env.DARAJA_PASSKEY!;
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

/**
 * Get timestamp in Daraja format: YYYYMMDDHHmmss
 */
export function getDarajaTimestamp(): string {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

/**
 * Initiate M-Pesa STK Push.
 */
export async function initiateStkPush(
  phone: string,
  amount: number,
  accountReference: string,
  checkoutRequestId?: string,
): Promise<StkPushResult> {
  const token = await getDarajaToken();
  const timestamp = getDarajaTimestamp();
  const password = generateStkPassword(timestamp);

  const payload = {
    BusinessShortCode: process.env.DARAJA_BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount), // Daraja requires integer amount
    PartyA: phone.replace('+', ''),
    PartyB: process.env.DARAJA_BUSINESS_SHORT_CODE,
    PhoneNumber: phone.replace('+', ''),
    CallBackURL: process.env.DARAJA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: process.env.DARAJA_TRANSACTION_DESC || 'Loan Repayment',
  };

  const response = await axios.post(
    `${getBase()}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );

  return {
    merchantRequestId: response.data.MerchantRequestID,
    checkoutRequestId: response.data.CheckoutRequestID,
    responseCode: response.data.ResponseCode,
    responseDescription: response.data.ResponseDescription,
    customerMessage: response.data.CustomerMessage,
  };
}

/**
 * Query STK Push transaction status from Daraja.
 */
export async function queryStkStatus(checkoutRequestId: string) {
  const token = await getDarajaToken();
  const timestamp = getDarajaTimestamp();
  const password = generateStkPassword(timestamp);

  const response = await axios.post(
    `${getBase()}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.DARAJA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    },
  );

  return response.data;
}

/**
 * Validate that the callback source IP is from Safaricom's known ranges.
 * In production, maintain an up-to-date list from Safaricom developer portal.
 */
const SAFARICOM_IP_RANGES = [
  '196.201.214.0/23',
  '196.201.213.0/24',
  // Add more from Safaricom's published list
];

export function validateSafaricomIp(ip: string): boolean {
  if (process.env.DARAJA_ENV !== 'production') return true; // allow all in sandbox
  // Simple prefix check — use a proper CIDR library in production
  return SAFARICOM_IP_RANGES.some((range) => {
    const prefix = range.split('/')[0].split('.').slice(0, 3).join('.');
    return ip.startsWith(prefix);
  });
}
