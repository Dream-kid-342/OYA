import { prisma } from '@oya/database';
import Decimal from 'decimal.js';
import { todayEAT } from './date.utils';
import { getLoanAlertsQueue, getAuditLogsQueue } from '@oya/shared';

/**
 * Run the daily penalty calculation.
 * Called at 00:01 EAT each day by the queue worker cron.
 * For each UNPAID/PARTIAL installment past due_date, calculate and record penalty.
 */
export async function runDailyPenaltyCalculation(date?: Date): Promise<{ processed: number; errors: number }> {
  const today = date || todayEAT();
  let processed = 0;
  let errors = 0;

  // Get all overdue installments with their loan's penalty config
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ['UNPAID', 'PARTIAL'] },
    },
    include: {
      loan: {
        include: {
          loanProduct: true,
        },
      },
    },
  });

  for (const inst of overdueInstallments) {
    try {
      const daysOverdue = Math.floor(
        (today.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue < 1) continue;

      // Check if penalty for today already exists
      const existingPenalty = await prisma.penalty.findFirst({
        where: {
          installmentId: inst.id,
          daysOverdue,
        },
      });

      if (existingPenalty) continue;

      const product = inst.loan.loanProduct;
      let penaltyAmount: Decimal;

      if (product?.penaltyType === 'FLAT') {
        // Flat KES 50/day (or configured amount)
        const flatAmount = new Decimal(product.penaltyAmount?.toString() || '50');
        penaltyAmount = flatAmount;
      } else if (product?.penaltyType === 'PERCENTAGE') {
        // Percentage of outstanding balance
        const outstanding = new Decimal(inst.amountDue.toString()).sub(
          new Decimal(inst.amountPaid.toString()),
        );
        const rate = new Decimal(product.penaltyPercentage?.toString() || '0.02');
        penaltyAmount = outstanding.mul(rate);
      } else {
        // Default flat KES 50
        penaltyAmount = new Decimal('50');
      }

      // Create penalty record
      await prisma.$transaction(async (tx) => {
        await tx.penalty.create({
          data: {
            loanId: inst.loanId,
            installmentId: inst.id,
            daysOverdue,
            amount: penaltyAmount,
            reason: `Day ${daysOverdue} overdue penalty`,
          },
        });

        // Update loan total penalties
        const loan = inst.loan;
        await tx.loan.update({
          where: { id: inst.loanId },
          data: {
            totalPenalties: new Decimal(loan.totalPenalties.toString()).add(penaltyAmount),
          },
        });
      });

      // Queue reminder notifications for days 1, 3, 7
      if ([1, 3, 7].includes(daysOverdue)) {
        await getLoanAlertsQueue().add('overdue-reminder', {
          loanId: inst.loanId,
          installmentId: inst.id,
          userId: inst.loan.userId,
          daysOverdue,
          amountOverdue: parseFloat(inst.amountDue.toString()) - parseFloat(inst.amountPaid.toString()),
        });
      }

      processed++;
    } catch (err) {
      errors++;
      console.error(`[PenaltyEngine] Error processing installment ${inst.id}:`, err);
    }
  }

  console.info(`[PenaltyEngine] Date=${todayEAT().toISOString()} processed=${processed} errors=${errors}`);
  return { processed, errors };
}
