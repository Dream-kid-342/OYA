import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { Queue } from 'bullmq';
import { getRedisClient, QUEUES, getPenaltyQueue, getReconciliationQueue } from '@oya/shared';

// Import workers to start them
import './workers/index';

const redis = getRedisClient();

// ─── Schedule daily cron jobs ─────────────────────────────

async function scheduleCronJobs() {
  const penaltyQueue = getPenaltyQueue();
  const reconciliationQueue = getReconciliationQueue();

  // Remove existing repeatable jobs to avoid duplicates
  const existingRepeatable = await penaltyQueue.getRepeatableJobs();
  for (const job of existingRepeatable) {
    await penaltyQueue.removeRepeatableByKey(job.key);
  }

  // Daily penalty calculation at 00:01 EAT (21:01 UTC previous day)
  await penaltyQueue.add(
    'daily-penalty-run',
    { date: new Date().toISOString() },
    {
      repeat: { pattern: '1 21 * * *' }, // 00:01 EAT = 21:01 UTC
      jobId: 'daily-penalty-calculation',
      removeOnComplete: true,
    },
  );

  // Daily reconciliation at 02:00 EAT (23:00 UTC previous day)
  await reconciliationQueue.add(
    'daily-reconciliation',
    { date: new Date().toISOString() },
    {
      repeat: { pattern: '0 23 * * *' }, // 02:00 EAT = 23:00 UTC
      jobId: 'daily-payment-reconciliation',
      removeOnComplete: true,
    },
  );

  console.info('✅ Cron jobs scheduled: penalty calculation (00:01 EAT), reconciliation (02:00 EAT)');
}

scheduleCronJobs().catch((err) => {
  console.error('Failed to schedule cron jobs:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down workers gracefully...');
  await redis.quit();
  process.exit(0);
});

console.info('✅ Queue worker service started');
