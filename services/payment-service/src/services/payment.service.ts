import crypto from 'crypto';
import Decimal from 'decimal.js';
import { prisma } from '@oya/database';
import { getRedisClient, RedisKeys, RedisTTL, getNotificationsQueue, getAuditLogsQueue } from '@oya/shared';
import { validateAndNormalize } from '@oya/shared';
import { initiateStkPush, validateSafaricomIp, queryStkStatus } from './daraja.service';
import { applyPaymentToInstallments } from '../../loan-service/src/services/repayment-schedule.service';

/**
 * Generate idempotency key: SHA256(userId + loanId + amount + minute)
 */
function generateIdempotencyKey(userId: string, loanId: string, amount: number): string {
  const minute = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  return crypto
    .createHash('sha256')
    .update(`${userId}:${loanId}:${amount}:${minute}`)
    .digest('hex');
}

/**
 * Initiate M-Pesa STK Push payment.
 */
export async function initiatePayment(
  userId: string,
  loanId: string,
  phoneNumber: string,
  amount: number,
  ipAddress?: string,
) {
  // Validate
  if (amount <= 0) throw Object.assign(new Error('Amount must be greater than 0'), { statusCode: 400 });

  const phone = validateAndNormalize(phoneNumber);

  // Check loan ownership + status
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId, deletedAt: null },
    select: { id: true, referenceNumber: true, status: true, balanceRemaining: true },
  });

  if (!loan) throw Object.assign(new Error('Loan not found'), { statusCode: 404 });
  if (loan.status !== 'ACTIVE') throw Object.assign(new Error('Loan is not active'), { statusCode: 422 });

  // Idempotency check
  const redis = getRedisClient();
  const idempKey = generateIdempotencyKey(userId, loanId, amount);
  const idempRedisKey = RedisKeys.idempotency(idempKey);

  const alreadyExists = await redis.set(idempRedisKey, '1', 'NX', 'EX', RedisTTL.IDEMPOTENCY);
  if (!alreadyExists) {
    throw Object.assign(new Error('Duplicate payment request. Please wait before retrying.'), { statusCode: 409 });
  }

  // Create pending payment request
  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      userId,
      loanId,
      amount,
      phoneNumber: phone,
      idempotencyKey: idempKey,
      status: 'PENDING',
    },
  });

  try {
    // Initiate STK Push
    const result = await initiateStkPush(phone, amount, loan.referenceNumber);

    // Update payment request with Daraja response
    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: {
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        darajaResponse: result as any,
      },
    });

    await getAuditLogsQueue().add('payment.initiated', {
      actorType: 'USER',
      actorId: userId,
      action: 'PAYMENT_INITIATED',
      entityType: 'payment_requests',
      entityId: paymentRequest.id,
      newValues: { amount, phone, checkoutRequestId: result.checkoutRequestId },
      ipAddress,
    });

    return {
      paymentRequestId: paymentRequest.id,
      checkoutRequestId: result.checkoutRequestId,
      message: result.customerMessage,
    };
  } catch (err) {
    // Mark as failed — don't silently swallow
    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'FAILED' },
    });
    // Remove idempotency key to allow retry
    await redis.del(idempRedisKey);
    throw err;
  }
}

/**
 * Process M-Pesa STK Push callback.
 * This is the most security-critical function in the system.
 */
export async function processMpesaCallback(
  rawBody: Record<string, unknown>,
  sourceIp: string,
) {
  // 1. Validate source IP
  if (!validateSafaricomIp(sourceIp)) {
    throw Object.assign(new Error('Callback from unauthorized IP'), { statusCode: 403 });
  }

  // 2. Store raw callback IMMEDIATELY before any processing
  const body = rawBody as any;
  const stkCallback = body?.Body?.stkCallback;

  if (!stkCallback) {
    throw Object.assign(new Error('Invalid callback format'), { statusCode: 400 });
  }

  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;

  await prisma.paymentCallbackRaw.create({
    data: {
      checkoutRequestId,
      rawBody: rawBody as any,
      sourceIp,
      processed: false,
    },
  });

  // 3. Find corresponding payment request
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { checkoutRequestId },
    include: { loan: { select: { id: true, userId: true, referenceNumber: true, balanceRemaining: true } } },
  });

  if (!paymentRequest) {
    console.error(`[Callback] Unknown checkoutRequestId: ${checkoutRequestId}`);
    return { ResultCode: 0 }; // ACK to Daraja
  }

  // 4. Idempotency — if already processed, acknowledge
  if (paymentRequest.status === 'SUCCESS') {
    return { ResultCode: 0 };
  }

  // 5. Only credit on ResultCode 0
  if (resultCode !== 0) {
    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'FAILED', callbackReceivedAt: new Date() },
    });
    return { ResultCode: 0 };
  }

  // 6. Extract callback items
  const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
  const getItem = (name: string) =>
    callbackMetadata.find((i: any) => i.Name === name)?.Value;

  const mpesaReceiptNumber: string = getItem('MpesaReceiptNumber');
  const transactionDate: string = getItem('TransactionDate')?.toString();
  const callbackAmount = parseFloat(getItem('Amount'));
  const phoneNumber: string = '+' + getItem('PhoneNumber');

  if (!mpesaReceiptNumber || !callbackAmount) {
    console.error('[Callback] Missing required callback fields');
    return { ResultCode: 0 };
  }

  // 7. Idempotency: check if receipt already exists
  const existingRepayment = await prisma.repayment.findUnique({
    where: { mpesaReceiptNumber },
  });

  if (existingRepayment) {
    await prisma.paymentCallbackRaw.updateMany({
      where: { checkoutRequestId },
      data: { processed: true },
    });
    return { ResultCode: 0 };
  }

  // 8. Validate amount — MUST match expected amount (tolerance: KES 1)
  const expectedAmount = parseFloat(paymentRequest.amount.toString());
  const tolerance = 1;

  if (Math.abs(callbackAmount - expectedAmount) > tolerance) {
    // Flag for manual reconciliation — do NOT auto-credit wrong amount
    console.error(
      `[Callback] Amount mismatch! Expected=${expectedAmount} Got=${callbackAmount} Receipt=${mpesaReceiptNumber}`,
    );
    // TODO: Alert admin via Redis pub/sub
    return { ResultCode: 0 };
  }

  // 9. Atomic database transaction
  await prisma.$transaction(async (tx) => {
    // Lock loan record to prevent concurrent updates
    await tx.$executeRaw`SELECT id FROM loans WHERE id = ${paymentRequest.loanId} FOR UPDATE`;

    const loan = paymentRequest.loan!;
    const amount = new Decimal(callbackAmount);
    const currentBalance = new Decimal(loan.balanceRemaining?.toString() || '0');
    const newBalance = currentBalance.sub(amount).lessThan(0) ? new Decimal(0) : currentBalance.sub(amount);

    // Create repayment record
    const repayment = await tx.repayment.create({
      data: {
        loanId: paymentRequest.loanId,
        userId: paymentRequest.userId,
        amount,
        mpesaReceiptNumber,
        phoneNumber: `+${phoneNumber}`,
        paymentMethod: 'MPESA',
        checkoutRequestId,
        transactionDate: new Date(),
        reconciled: true,
      },
    });

    // Apply to installments
    await applyPaymentToInstallments(paymentRequest.loanId, amount, tx as any);

    // Update loan balance
    const updatedLoan = await tx.loan.update({
      where: { id: paymentRequest.loanId },
      data: {
        totalRepaid: { increment: amount },
        balanceRemaining: newBalance,
        status: newBalance.isZero() ? 'CLOSED' : undefined,
        actualCloseDate: newBalance.isZero() ? new Date() : undefined,
      },
    });

    // Update payment request
    await tx.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'SUCCESS', callbackReceivedAt: new Date() },
    });

    // Mark raw callback processed
    await tx.paymentCallbackRaw.updateMany({
      where: { checkoutRequestId },
      data: { processed: true },
    });

    return { repayment, updatedLoan };
  });

  // 10. Invalidate Redis cache
  const redis = getRedisClient();
  await redis.del(RedisKeys.loanBalance(paymentRequest.loanId));
  await redis.del(RedisKeys.loanCache(paymentRequest.loanId));

  // 11. Publish event for real-time updates
  await redis.publish(
    `payment.confirmed:${paymentRequest.loanId}`,
    JSON.stringify({ amount: callbackAmount, receipt: mpesaReceiptNumber }),
  );

  // 12. Push notification to client
  const user = await prisma.user.findUnique({
    where: { id: paymentRequest.userId },
    select: { fcmToken: true, phoneNumber: true },
  });

  const loan = await prisma.loan.findUnique({
    where: { id: paymentRequest.loanId },
    select: { balanceRemaining: true },
  });

  await getNotificationsQueue().add('payment-confirmed', {
    userId: paymentRequest.userId,
    title: 'Payment Received ✓',
    body: `Payment of KES ${callbackAmount.toLocaleString()} received. Receipt: ${mpesaReceiptNumber}. New balance: KES ${parseFloat(loan?.balanceRemaining?.toString() || '0').toLocaleString()}.`,
    type: 'PAYMENT',
    channels: ['PUSH'],
    fcmToken: user?.fcmToken || undefined,
    phone: user?.phoneNumber,
  });

  await getAuditLogsQueue().add('payment.confirmed', {
    actorType: 'SYSTEM',
    actorId: paymentRequest.userId,
    action: 'PAYMENT_CONFIRMED',
    entityType: 'repayments',
    newValues: { amount: callbackAmount, mpesaReceiptNumber, checkoutRequestId },
  });

  return { ResultCode: 0 };
}

/**
 * Query payment status.
 */
export async function getPaymentStatus(checkoutRequestId: string, userId: string) {
  const request = await prisma.paymentRequest.findFirst({
    where: { checkoutRequestId, userId },
    select: { status: true, checkoutRequestId: true, amount: true, createdAt: true },
  });

  if (!request) throw Object.assign(new Error('Payment request not found'), { statusCode: 404 });

  // If still pending after 1 min, query Daraja directly
  if (request.status === 'PENDING') {
    try {
      const darajaStatus = await queryStkStatus(checkoutRequestId);
      if (darajaStatus.ResultCode === '0') {
        return { ...request, status: 'SUCCESS', darajaStatus };
      }
    } catch {
      // Daraja query failed — return DB status
    }
  }

  return request;
}
