import { prisma } from '@oya/database';
import Decimal from 'decimal.js';

/**
 * Apply a payment to the earliest unpaid installment.
 * Duplicated from loan-service to avoid cross-service imports at build time.
 */
export async function applyPaymentToInstallments(
  loanId: string,
  paymentAmount: Decimal,
  tx: typeof prisma,
): Promise<void> {
  let remaining = paymentAmount;

  const unpaidInstallments = await tx.installment.findMany({
    where: { loanId, status: { in: ['UNPAID', 'PARTIAL'] } },
    orderBy: { installmentNumber: 'asc' },
  });

  for (const inst of unpaidInstallments) {
    if (remaining.lessThanOrEqualTo(0)) break;

    const outstanding = new Decimal(inst.amountDue.toString()).sub(
      new Decimal(inst.amountPaid.toString()),
    );

    const toApply = remaining.greaterThan(outstanding) ? outstanding : remaining;
    const newAmountPaid = new Decimal(inst.amountPaid.toString()).add(toApply);
    const newStatus = newAmountPaid.greaterThanOrEqualTo(new Decimal(inst.amountDue.toString()))
      ? 'PAID'
      : 'PARTIAL';

    await tx.installment.update({
      where: { id: inst.id },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? new Date() : null,
      },
    });

    remaining = remaining.sub(toApply);
  }
}
