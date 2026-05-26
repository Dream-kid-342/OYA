import { prisma } from '@oya/database';
import Decimal from 'decimal.js';
import { calculateWeeklyInstallment } from '@oya/shared';
import { addWeeks } from './date.utils';

/**
 * Generate sequential installment records for a loan.
 * Starts the week AFTER disbursement date.
 * All math uses decimal.js — no floats.
 */
export async function generateRepaymentSchedule(
  loanId: string,
  principal: Decimal,
  interestRate: Decimal,
  numberOfWeeks: number,
  disbursementDate: Date,
): Promise<void> {
  const { weeklyInstallment, totalInterest, totalAmount } =
    calculateWeeklyInstallment(principal, interestRate, numberOfWeeks);

  const installments = [];

  let runningTotal = new Decimal(0);

  for (let i = 1; i <= numberOfWeeks; i++) {
    const dueDate = addWeeks(disbursementDate, i);
    let amount = weeklyInstallment;

    // Last installment: adjust for rounding differences
    if (i === numberOfWeeks) {
      amount = totalAmount.sub(runningTotal);
      // Ensure non-negative
      if (amount.lessThan(0)) amount = new Decimal(0);
    }

    runningTotal = runningTotal.add(amount);

    installments.push({
      loanId,
      installmentNumber: i,
      dueDate,
      amountDue: amount,
    });
  }

  await prisma.installment.createMany({ data: installments });

  // Update loan with computed financials
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      totalInterest,
      totalAmount,
      balanceRemaining: totalAmount,
      weeklyInstallment,
    },
  });
}

/**
 * Apply a payment to the earliest unpaid installment.
 * Returns the installment updated and remaining amount.
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
