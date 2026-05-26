import { DashboardRepository } from '../repositories/dashboard.repository';

const repository = new DashboardRepository();

export class DashboardService {
  async getDashboardStats() {
    const [
      totalActiveLoans,
      disbursedToday,
      collectedToday,
      overdueLoans,
      pendingApproval,
      newRegistrationsToday,
      weeklyCollections,
      monthlyDisbursements,
      loanStatusDistribution,
    ] = await Promise.all([
      repository.getActiveLoansStats(),
      repository.getDisbursedToday(),
      repository.getCollectedToday(),
      repository.getOverdueLoansStats(),
      repository.getPendingApprovalCount(),
      repository.getNewRegistrationsToday(),
      repository.getWeeklyCollections(),
      repository.getMonthlyDisbursements(),
      repository.getLoanStatusDistribution(),
    ]);

    return {
      totalActiveLoans,
      disbursedToday,
      collectedToday,
      overdueLoans,
      pendingApproval,
      newRegistrationsToday,
      weeklyCollections,
      monthlyDisbursements,
      loanStatusDistribution,
    };
  }
}

export const dashboardService = new DashboardService();
