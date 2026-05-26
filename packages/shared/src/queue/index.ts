import { Queue, Job } from 'bullmq';
import { getRedisClient } from '../redis/client';

const redis = getRedisClient();

export const QUEUES = {
  NOTIFICATIONS: 'notifications_queue',
  AUDIT_LOGS: 'audit_logs_queue',
  PENALTY_CALCULATION: 'penalty_calculation_queue',
  PAYMENT_RECONCILIATION: 'payment_reconciliation_queue',
  LOAN_STATUS_ALERTS: 'loan_status_alerts_queue',
  DOCUMENT_PROCESSING: 'document_processing_queue',
} as const;

export const auditLogsQueue = new Queue(QUEUES.AUDIT_LOGS, { connection: redis });
export const documentProcessingQueue = new Queue(QUEUES.DOCUMENT_PROCESSING, { connection: redis });

export interface DocumentProcessingJob {
  userId: string;
  documentId: string;
  documentType: 'NATIONAL_ID_FRONT' | 'SELFIE' | 'BUSINESS_PROOF';
  storagePath: string;
}

export interface AuditLogJob {
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const logAdminAction = async (job: Omit<AuditLogJob, 'actorType'>) => {
  await auditLogsQueue.add('log-admin-action', {
    ...job,
    actorType: 'ADMIN',
  });
};

export const logUserAction = async (job: Omit<AuditLogJob, 'actorType'>) => {
  await auditLogsQueue.add('log-user-action', {
    ...job,
    actorType: 'USER',
  });
};
