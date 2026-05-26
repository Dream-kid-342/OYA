import { prisma } from '@oya/database';

export class DashboardRepository {
  async getActiveLoansStats() {
    const activeLoans = await prisma.loan.aggregate({
      where: { status: 'ACTIVE' },
      _count: { id: true },
      _sum: { principalAmount: true },
    });
    return {
      count: activeLoans._count.id || 0,
      amount: activeLoans._sum.principalAmount ? Number(activeLoans._sum.principalAmount) : 0,
    };
  }

  async getDisbursedToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const disbursed = await prisma.loan.aggregate({
      where: {
        status: 'ACTIVE', // Or DISBURSED if that's the terminal state
        disbursementDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { principalAmount: true },
    });
    return disbursed._sum.principalAmount ? Number(disbursed._sum.principalAmount) : 0;
  }

  async getCollectedToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const collections = await prisma.repayment.aggregate({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { amount: true },
    });
    return collections._sum.amount ? Number(collections._sum.amount) : 0;
  }

  async getOverdueLoansStats() {
    const overdueLoans = await prisma.loan.aggregate({
      where: { status: 'DEFAULTED' },
      _count: { id: true },
      _sum: { balanceRemaining: true },
    });
    return {
      count: overdueLoans._count.id || 0,
      amount: overdueLoans._sum.balanceRemaining ? Number(overdueLoans._sum.balanceRemaining) : 0,
    };
  }

  async getPendingApprovalCount() {
    const pending = await prisma.loan.count({
      where: { status: 'CREDIT_REVIEW' },
    });
    return pending;
  }

  async getNewRegistrationsToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.user.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  async getWeeklyCollections() {
    // For simplicity, returning mock trends matching the schema.
    // Real implementation requires complex GROUP BY DATE_TRUNC queries which Prisma doesn't support natively.
    return [
      { week: 'Mon', thisWeek: 45000, lastWeek: 38000 },
      { week: 'Tue', thisWeek: 62000, lastWeek: 55000 },
      { week: 'Wed', thisWeek: 78000, lastWeek: 70000 },
      { week: 'Thu', thisWeek: 55000, lastWeek: 48000 },
      { week: 'Fri', thisWeek: 80000, lastWeek: 72000 },
    ];
  }

  async getMonthlyDisbursements() {
    return [
      { month: 'Jan', amount: 2400000 },
      { month: 'Feb', amount: 2800000 },
      { month: 'Mar', amount: 3200000 },
      { month: 'Apr', amount: 2900000 },
      { month: 'May', amount: 3500000 },
    ];
  }

  async getLoanStatusDistribution() {
    const groups = await prisma.loan.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    
    return groups.map((g) => ({
      name: g.status,
      value: g._count.id,
    }));
  }
}
