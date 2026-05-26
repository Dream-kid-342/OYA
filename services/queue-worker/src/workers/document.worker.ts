import { Worker, Job } from 'bullmq';
import { getRedisClient, QUEUES, DocumentProcessingJob } from '@oya/shared';
import { prisma } from '@oya/database';
// In a real scenario, this would use a library like Tesseract.js, AWS Textract, or Google Cloud Vision
// to extract data from the ID or verify the selfie against the ID.

const redis = getRedisClient();

export const documentProcessingWorker = new Worker<DocumentProcessingJob>(
  QUEUES.DOCUMENT_PROCESSING,
  async (job: Job<DocumentProcessingJob>) => {
    const { userId, documentId, documentType, storagePath } = job.data;
    
    // Simulate OCR / verification processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Example logic: auto-verify if the system considers it "confident" enough, 
    // or flag for manual review. We'll simulate a 90% auto-verify rate.
    const isVerified = Math.random() > 0.1;
    const status = isVerified ? 'VERIFIED' : 'PENDING';
    
    await prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewedAt: isVerified ? new Date() : null,
        reviewedBy: isVerified ? 'SYSTEM' : null,
        rejectionReason: !isVerified ? 'Automated verification failed, manual review required.' : null,
      },
    });

    // Check if user is fully verified
    if (isVerified) {
      const allDocs = await prisma.kycDocument.findMany({
        where: { userId },
      });
      
      const allVerified = allDocs.every(doc => doc.status === 'VERIFIED');
      if (allVerified && allDocs.length >= 2) { // Assuming at least ID and Selfie are needed
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: 'VERIFIED' },
        });
        
        // Push an audit log for the system automatically verifying the user
        const { auditLogsQueue } = await import('@oya/shared');
        await auditLogsQueue.add('log-system-action', {
          actorType: 'SYSTEM',
          actorId: 'SYSTEM',
          action: 'AUTO_VERIFY_KYC',
          entityType: 'USER',
          entityId: userId,
        });
      }
    }
  },
  { connection: redis, concurrency: 2 }
);

documentProcessingWorker.on('failed', (job, err) => {
  console.error(`[DocumentProcessingWorker] Job ${job?.id} failed:`, err);
});
