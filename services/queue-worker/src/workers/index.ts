// @ts-nocheck
import { Worker, Job } from 'bullmq';
import { getRedisClient, QUEUES, NotificationJob, AuditLogJob, PenaltyCalculationJob, PaymentReconciliationJob, LoanStatusAlertJob } from '@oya/shared';
import { prisma } from '@oya/database';
import { sendPushNotification } from '../services/fcm.service';
import { sendSms, formatSmsMessage } from '../services/sms.service';

const redis = getRedisClient();

const WORKER_OPTS = {
  connection: redis,
  concurrency: 3,
};

// ─── Notifications Worker ─────────────────────────────────
export const notificationsWorker = new Worker<NotificationJob>(
  QUEUES.NOTIFICATIONS,
  async (job: Job<NotificationJob>) => {
    const { userId, title, body, type, data, channels, fcmToken, phone } = job.data;

    const sentVia: string[] = [];

    // Push notification
    if (channels.includes('PUSH') && fcmToken) {
      const sent = await sendPushNotification({
        token: fcmToken,
        title,
        body,
        data: data as Record<string, string>,
      });
      if (sent) sentVia.push('PUSH');
    }

    // SMS
    if (channels.includes('SMS') && phone) {
      const sent = await sendSms(phone, formatSmsMessage(title, body));
      if (sent) sentVia.push('SMS');
    }

    // Store notification in DB
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: data as any,
        sentVia,
        delivered: sentVia.length > 0,
      },
    });

    return { sentVia };
  },
  { ...WORKER_OPTS, concurrency: 3 },
);

// ─── Audit Logs Worker ────────────────────────────────────
export const auditLogsWorker = new Worker<AuditLogJob>(
  QUEUES.AUDIT_LOGS,
  async (job: Job<AuditLogJob>) => {
    const { actorType, actorId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent } = job.data;

    await prisma.auditLog.create({
      data: {
        actorType: actorType as any,
        actorId,
        action,
        entityType,
        entityId,
        oldValues: oldValues as any,
        newValues: newValues as any,
        ipAddress,
        userAgent,
      },
    });
  },
  { ...WORKER_OPTS, concurrency: 2 },
);

// ─── Penalty Calculation Worker ───────────────────────────
export const penaltyWorker = new Worker<PenaltyCalculationJob>(
  QUEUES.PENALTY_CALCULATION,
  async (job: Job<PenaltyCalculationJob>) => {
    const { runDailyPenaltyCalculation } = await import('../../loan-service/src/services/penalty.service');
    const date = job.data.date ? new Date(job.data.date) : undefined;
    const result = await runDailyPenaltyCalculation(date);
    return result;
  },
  { ...WORKER_OPTS, concurrency: 1 },
);

// ─── Loan Status Alerts Worker ────────────────────────────
export const loanAlertsWorker = new Worker<LoanStatusAlertJob>(
  QUEUES.LOAN_STATUS_ALERTS,
  async (job: Job<LoanStatusAlertJob>) => {
    const { userId, daysOverdue, amountOverdue, loanId } = job.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true, fcmToken: true },
    });

    if (!user) return;

    const title = daysOverdue === 1 ? 'Payment Overdue' : `${daysOverdue} Days Overdue`;
    const body = `Your loan installment of KES ${amountOverdue.toLocaleString()} is ${daysOverdue} day(s) overdue. Please pay now to avoid further penalties.`;

    await sendSms(user.phoneNumber, formatSmsMessage(title, body));

    if (user.fcmToken) {
      await sendPushNotification({ token: user.fcmToken, title, body });
    }

    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type: 'OVERDUE_REMINDER',
        sentVia: ['SMS', user.fcmToken ? 'PUSH' : ''].filter(Boolean),
        delivered: true,
      },
    });
  },
  { ...WORKER_OPTS, concurrency: 1 },
);

import { documentProcessingWorker } from './document.worker';

// ─── Error handling for all workers ──────────────────────
[notificationsWorker, auditLogsWorker, penaltyWorker, loanAlertsWorker, documentProcessingWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    console.error(`[Worker:${worker.name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.debug(`[Worker:${worker.name}] Job ${job.id} completed`);
  });
});

console.info('✅ All BullMQ workers started');
