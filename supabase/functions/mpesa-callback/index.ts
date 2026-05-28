// Supabase Edge Function: mpesa-callback
// Deployed at: https://ztgixpqhyvomlqgbldjq.supabase.co/functions/v1/mpesa-callback
//
// This is the REAL Daraja callback endpoint. It:
// 1. Receives raw M-PESA callbacks from Safaricom directly via HTTPS
// 2. Stores the raw callback into the payment_callback_raw table via Supabase
// 3. Updates payment_requests status in real-time
// 4. Triggers downstream loan balance and installment updates via RPC

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Safaricom production IP ranges ──────────────────────────────────────────
const SAFARICOM_IP_RANGES = [
  '196.201.214.',
  '196.201.213.',
  '196.201.216.',
  '196.201.217.',
  '196.201.218.',
  '196.201.219.',
];

function validateSafaricomIp(ip: string): boolean {
  // In sandbox mode, allow all IPs
  if (Deno.env.get('DARAJA_ENV') !== 'production') return true;
  return SAFARICOM_IP_RANGES.some((prefix) => ip.startsWith(prefix));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Always respond 200 to Daraja even on errors to prevent retries
  const ack = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted', ...extra }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Validate source IP (Safaricom only in production)
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!validateSafaricomIp(clientIp)) {
    console.error(`[mpesa-callback] Blocked unauthorized IP: ${clientIp}`);
    return new Response(JSON.stringify({ ResultCode: 403, ResultDesc: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    console.error('[mpesa-callback] Invalid JSON body');
    return ack(); // Ack anyway to stop retries
  }

  // Initialize Supabase client with the service role key (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const stkCallback = (rawBody as any)?.Body?.stkCallback;

  if (!stkCallback) {
    console.error('[mpesa-callback] Missing stkCallback body');
    return ack();
  }

  const checkoutRequestId: string = stkCallback.CheckoutRequestID;
  const resultCode: number = stkCallback.ResultCode;

  // ── 1. Store raw callback immediately (audit trail) ──────────────────────
  const { error: rawInsertError } = await supabase
    .from('payment_callback_raw')
    .insert({
      checkout_request_id: checkoutRequestId,
      raw_body: rawBody,
      source_ip: clientIp,
      processed: false,
    });

  if (rawInsertError) {
    console.error('[mpesa-callback] Failed to store raw callback:', rawInsertError.message);
    // Continue processing anyway — don't fail
  }

  // ── 2. Find the corresponding payment request ─────────────────────────────
  const { data: paymentRequest, error: prError } = await supabase
    .from('payment_requests')
    .select('id, user_id, loan_id, amount, status')
    .eq('checkout_request_id', checkoutRequestId)
    .single();

  if (prError || !paymentRequest) {
    console.error(`[mpesa-callback] Unknown checkoutRequestId: ${checkoutRequestId}`);
    return ack(); // Ack to stop Daraja retrying for unknown transactions
  }

  // Idempotency: if already processed, just ack
  if (paymentRequest.status === 'SUCCESS') {
    console.log(`[mpesa-callback] Already processed: ${checkoutRequestId}`);
    return ack();
  }

  // ── 3. Handle failure result ──────────────────────────────────────────────
  if (resultCode !== 0) {
    await supabase
      .from('payment_requests')
      .update({ status: 'FAILED', callback_received_at: new Date().toISOString() })
      .eq('id', paymentRequest.id);

    console.log(`[mpesa-callback] Payment failed. ResultCode=${resultCode} for ${checkoutRequestId}`);
    return ack();
  }

  // ── 4. Extract callback metadata ─────────────────────────────────────────
  const items: Array<{ Name: string; Value: unknown }> =
    stkCallback.CallbackMetadata?.Item || [];

  const getItem = (name: string) => items.find((i) => i.Name === name)?.Value;

  const mpesaReceiptNumber = getItem('MpesaReceiptNumber') as string;
  const callbackAmount = parseFloat(String(getItem('Amount')));
  const phoneNumber = '+' + String(getItem('PhoneNumber'));

  if (!mpesaReceiptNumber || isNaN(callbackAmount)) {
    console.error('[mpesa-callback] Missing required callback fields');
    return ack();
  }

  // ── 5. Check for duplicate receipt number (idempotency) ──────────────────
  const { data: existing } = await supabase
    .from('repayments')
    .select('id')
    .eq('mpesa_receipt_number', mpesaReceiptNumber)
    .maybeSingle();

  if (existing) {
    console.log(`[mpesa-callback] Duplicate receipt: ${mpesaReceiptNumber}`);
    await supabase
      .from('payment_callback_raw')
      .update({ processed: true })
      .eq('checkout_request_id', checkoutRequestId);
    return ack();
  }

  // ── 6. Validate amount (tolerance: KES 1) ────────────────────────────────
  const expectedAmount = parseFloat(String(paymentRequest.amount));
  if (Math.abs(callbackAmount - expectedAmount) > 1) {
    console.error(
      `[mpesa-callback] Amount mismatch! Expected=${expectedAmount} Got=${callbackAmount}`,
    );
    return ack(); // Flag for manual reconciliation
  }

  // ── 7. Call the Supabase RPC to atomically apply the payment ─────────────
  // This stored procedure handles: creating the repayment record,
  // updating installments, updating the loan balance, and marking the payment SUCCESS.
  const { error: rpcError } = await supabase.rpc('apply_mpesa_payment', {
    p_loan_id: paymentRequest.loan_id,
    p_user_id: paymentRequest.user_id,
    p_payment_request_id: paymentRequest.id,
    p_amount: callbackAmount,
    p_mpesa_receipt_number: mpesaReceiptNumber,
    p_phone_number: phoneNumber,
    p_checkout_request_id: checkoutRequestId,
  });

  if (rpcError) {
    console.error('[mpesa-callback] RPC apply_mpesa_payment failed:', rpcError.message);
    // Still ack to Daraja — manual reconciliation will catch this
    return ack({ note: 'Processing queued for reconciliation' });
  }

  // ── 8. Mark raw callback as processed ────────────────────────────────────
  await supabase
    .from('payment_callback_raw')
    .update({ processed: true })
    .eq('checkout_request_id', checkoutRequestId);

  console.log(
    `[mpesa-callback] ✅ Payment applied. Receipt=${mpesaReceiptNumber} Amount=KES ${callbackAmount} LoanID=${paymentRequest.loan_id}`,
  );

  return ack();
});
