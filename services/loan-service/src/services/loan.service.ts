import { prisma, LoanStatus } from '@oya/database';
import Decimal from 'decimal.js';
import { getRedisClient, RedisKeys, RedisTTL, getAuditLogsQueue, getNotificationsQueue } from '@oya/shared';
import { generateRepaymentSchedule } from './repayment-schedule.service';

/**
 * Generate unique loan reference number: OYA-XXXXX
 */
async function generateReferenceNumber(): Promise<string> {
  const count = await prisma.loan.count();
  const padded = String(count + 1).padStart(5, '0');
  return `OYA-${padded}`;
}

/**
 * Check user eligibility for a new loan.
 */
export async function checkLoanEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, kycStatus: true },
  });

  if (!user) return { eligible: false, reason: 'User not found' };
  if (user.status === 'SUSPENDED') return { eligible: false, reason: 'Account is suspended' };
  if (user.kycStatus !== 'VERIFIED') return { eligible: false, reason: 'KYC verification required' };

  const activeDefaulted = await prisma.loan.findFirst({
    where: {
      userId,
      status: 'DEFAULTED',
      deletedAt: null,
    },
  });

  if (activeDefaulted) return { eligible: false, reason: 'Active defaulted loan on record' };

  const activeLoan = await prisma.loan.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'DISBURSED', 'APPROVED'] },
      deletedAt: null,
    },
  });

  if (activeLoan) return { eligible: false, reason: 'You already have an active loan' };

  return { eligible: true };
}

/**
 * Create a new loan application (DRAFT → SUBMITTED).
 */
export async function createLoanApplication(
  userId: string,
  data: {
    loanProductId: string;
    principalAmount: number;
    purpose: string;
    monthlyRevenue?: number;
    numberOfEmployees?: number;
  },
  ipAddress?: string,
) {
  const eligibility = await checkLoanEligibility(userId);
  if (!eligibility.eligible) {
    throw Object.assign(new Error(eligibility.reason!), { statusCode: 422 });
  }

  const product = await prisma.loanProduct.findFirst({
    where: { id: data.loanProductId, isActive: true },
  });

  if (!product) throw Object.assign(new Error('Invalid loan product'), { statusCode: 400 });

  const principal = new Decimal(data.principalAmount);
  if (principal.lessThan(product.minAmount.toString()) || principal.greaterThan(product.maxAmount.toString())) {
    throw Object.assign(
      new Error(`Loan amount must be between KES ${product.minAmount} and KES ${product.maxAmount}`),
      { statusCode: 400 },
    );
  }

  const referenceNumber = await generateReferenceNumber();
  const interestRate = new Decimal(product.interestRate.toString());
  const totalInterest = principal.mul(interestRate);
  const totalAmount = principal.add(totalInterest);

  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        referenceNumber,
        userId,
        loanProductId: data.loanProductId,
        principalAmount: principal,
        interestRate,
        totalInterest,
        totalAmount,
        balanceRemaining: totalAmount,
        numberOfWeeks: product.maxWeeks,
        weeklyInstallment: totalAmount.div(product.maxWeeks),
        purpose: data.purpose as any,
        monthlyRevenue: data.monthlyRevenue,
        numberOfEmployees: data.numberOfEmployees,
        status: 'SUBMITTED',
      },
    });

    await tx.loanAuditTrail.create({
      data: {
        loanId: created.id,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        actorType: 'USER',
        actorId: userId,
        notes: 'Loan application submitted',
      },
    });

    return created;
  });

  // Queue notification + audit
  await getNotificationsQueue().add('loan-submitted', {
    userId,
    title: 'Loan Application Received',
    body: `Your loan application ${referenceNumber} has been received and is under review.`,
    type: 'LOAN',
    channels: ['PUSH', 'SMS'],
  });

  await getAuditLogsQueue().add('loan.created', {
    actorType: 'USER',
    actorId: userId,
    action: 'LOAN_SUBMITTED',
    entityType: 'loans',
    entityId: loan.id,
    newValues: { referenceNumber, principalAmount: data.principalAmount, status: 'SUBMITTED' },
    ipAddress,
  });

  return loan;
}

/**
 * Transition loan through workflow states.
 * Only admins can drive state transitions (except DRAFT → SUBMITTED by user).
 */
export async function transitionLoanStatus(
  loanId: string,
  toStatus: LoanStatus,
  actorId: string,
  actorType: 'USER' | 'ADMIN' | 'SYSTEM',
  notes?: string,
  tx?: typeof prisma,
) {
  const db = tx || prisma;

  const loan = await db.loan.findUniqueOrThrow({ where: { id: loanId } });
  const fromStatus = loan.status;

  const updated = await db.loan.update({
    where: { id: loanId },
    data: {
      status: toStatus,
      ...(toStatus === 'DISBURSED' && { disbursementDate: new Date(), status: 'ACTIVE' }),
      ...(toStatus === 'CLOSED' && { actualCloseDate: new Date() }),
    },
  });

  await db.loanAuditTrail.create({
    data: {
      loanId,
      fromStatus,
      toStatus,
      actorType,
      actorId,
      notes,
    },
  });

  // If disbursing, generate repayment schedule
  if (toStatus === 'DISBURSED' || toStatus === 'ACTIVE') {
    await generateRepaymentSchedule(
      loanId,
      new Decimal(loan.principalAmount.toString()),
      new Decimal(loan.interestRate.toString()),
      loan.numberOfWeeks,
      new Date(),
    );
  }

  // Invalidate Redis cache
  const redis = getRedisClient();
  await redis.del(RedisKeys.loanCache(loanId));
  await redis.del(RedisKeys.loanBalance(loanId));

  // Notify user
  const statusMessages: Partial<Record<LoanStatus, string>> = {
    APPROVED: 'Your loan has been approved! Disbursement is in progress.',
    REJECTED: `Your loan application was not approved. ${notes || ''}`,
    ACTIVE: 'Your loan has been disbursed to your M-Pesa account.',
    CLOSED: 'Congratulations! Your loan has been fully repaid.',
    DEFAULTED: 'Your loan has been marked as defaulted. Please contact support.',
  };

  if (statusMessages[toStatus]) {
    await getNotificationsQueue().add(`loan-status-${toStatus.toLowerCase()}`, {
      userId: loan.userId,
      title: `Loan ${toStatus.charAt(0) + toStatus.slice(1).toLowerCase()}`,
      body: statusMessages[toStatus]!,
      type: 'LOAN',
      channels: ['PUSH', 'SMS'],
    });
  }

  return updated;
}

/**
 * Get loan with full details (cached).
 */
export async function getLoanById(loanId: string, userId?: string) {
  const redis = getRedisClient();
  const cacheKey = RedisKeys.loanCache(loanId);
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId, deletedAt: null },
    include: {
      loanProduct: true,
      installments: { orderBy: { installmentNumber: 'asc' } },
      repayments: { orderBy: { createdAt: 'desc' } },
      penalties: { where: { waived: false } },
      auditTrail: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!loan) throw Object.assign(new Error('Loan not found'), { statusCode: 404 });

  // IDOR check: if userId provided, verify ownership
  if (userId && loan.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  await redis.set(cacheKey, JSON.stringify(loan), 'EX', RedisTTL.LOAN_CACHE);
  return loan;
}
