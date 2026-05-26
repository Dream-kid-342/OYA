import { Queue, QueueEvents } from 'bullmq';
import { getRedisClient } from '../redis/client';

// ─── Queue Names ──────────────────────────────────────────
export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit-logs',
  PAYMENT_RECONCILIATION: 'payment-reconciliation',
  PENALTY_CALCULATION: 'penalty-calculation',
  DOCUMENT_PROCESSING: 'document-processing',
  LOAN_STATUS_ALERTS: 'loan-status-alerts',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ─── Job Types ────────────────────────────────────────────
export interface NotificationJob {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  channels: Array<'PUSH' | 'SMS' | 'EMAIL'>;
  fcmToken?: string;
  phone?: string;
  email?: string;
}

export interface AuditLogJob {
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface PenaltyCalculationJob {
  date: string; // ISO date string
}

export interface PaymentReconciliationJob {
  date: string;
}

export interface DocumentProcessingJob {
  userId: string;
  documentType: string;
  storagePath: string;
  kycDocumentId: string;
}

export interface LoanStatusAlertJob {
  loanId: string;
  installmentId: string;
  userId: string;
  daysOverdue: number;
  amountOverdue: number;
}

// ─── Queue Factory ────────────────────────────────────────
const queueInstances = new Map<QueueName, Queue>();

export function getQueue<T = unknown>(name: QueueName): Queue<T> {
  if (!queueInstances.has(name)) {
    const redis = getRedisClient();
    const queue = new Queue<T>(name, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 5s, 25s
        },
        removeOnComplete: { count: 100 },
        removeOnFail: false, // keep failed jobs for dead-letter review
      },
    });
    queueInstances.set(name, queue as Queue);
  }
  return queueInstances.get(name) as Queue<T>;
}

// ─── Convenience queue accessors ──────────────────────────
export const getNotificationsQueue = () =>
  getQueue<NotificationJob>(QUEUES.NOTIFICATIONS);
export const getAuditLogsQueue = () =>
  getQueue<AuditLogJob>(QUEUES.AUDIT_LOGS);
export const getPenaltyQueue = () =>
  getQueue<PenaltyCalculationJob>(QUEUES.PENALTY_CALCULATION);
export const getReconciliationQueue = () =>
  getQueue<PaymentReconciliationJob>(QUEUES.PAYMENT_RECONCILIATION);
export const getDocumentQueue = () =>
  getQueue<DocumentProcessingJob>(QUEUES.DOCUMENT_PROCESSING);
export const getLoanAlertsQueue = () =>
  getQueue<LoanStatusAlertJob>(QUEUES.LOAN_STATUS_ALERTS);
