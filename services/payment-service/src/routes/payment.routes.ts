// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { initiatePayment, processMpesaCallback, getPaymentStatus } from '../services/payment.service';
import { validateSafaricomIp } from '../services/daraja.service';
import { prisma } from '@oya/database';

const InitiatePaymentSchema = z.object({
  loanId: z.string().uuid(),
  phoneNumber: z.string().min(10),
  amount: z.number().positive(),
});

export async function paymentRoutes(app: FastifyInstance) {
  // ─── POST /payments/initiate ────────────────────────────
  app.post('/initiate', {
    config: { rateLimit: { max: 10, timeWindow: 60000 } }, // 10/min per user
    preHandler: requireAuth,
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = (req as any).tokenPayload;
      const body = InitiatePaymentSchema.parse(req.body);

      const result = await initiatePayment(
        userId,
        body.loanId,
        body.phoneNumber,
        body.amount,
        req.ip,
      );

      return reply.status(202).send({
        success: true,
        message: result.message,
        data: {
          paymentRequestId: result.paymentRequestId,
          checkoutRequestId: result.checkoutRequestId,
        },
      });
    },
  });

  // ─── GET /payments/status/:checkoutRequestId ────────────
  app.get('/status/:checkoutRequestId', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest<{ Params: { checkoutRequestId: string } }>, reply) => {
      const { sub: userId } = (req as any).tokenPayload;
      const status = await getPaymentStatus(req.params.checkoutRequestId, userId);
      return reply.send({ success: true, data: status });
    },
  });

  // ─── POST /payments/callback ────────────────────────────
  // IP-restricted: Safaricom only. No authentication required (it's Daraja).
  app.post('/callback', {
    // Bypass global rate limit for Safaricom callbacks
    config: { rateLimit: { max: 1000, timeWindow: 60000 } },
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      // IP validation happens inside processMpesaCallback
      try {
        const result = await processMpesaCallback(req.body as Record<string, unknown>, req.ip);
        return reply.send(result);
      } catch (err: any) {
        if (err.statusCode === 403) {
          return reply.status(403).send({ ResultCode: 403, ResultDesc: 'Forbidden' });
        }
        // Always ACK to Daraja even on errors — log and handle offline
        req.log.error({ err, body: req.body }, 'Callback processing error');
        return reply.send({ ResultCode: 0 });
      }
    },
  });

  // ─── GET /payments/history ──────────────────────────────
  app.get('/history', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = (req as any).tokenPayload;
      const { loanId, page = '1', limit = '20' } = req.query as any;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: any = { userId };
      if (loanId) where.loanId = loanId;

      const [repayments, total] = await Promise.all([
        prisma.repayment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          select: {
            id: true, amount: true, mpesaReceiptNumber: true,
            phoneNumber: true, transactionDate: true, createdAt: true,
          },
        }),
        prisma.repayment.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: repayments,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      });
    },
  });
}

async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ statusCode: 401, message: 'Authorization required' });
  }
  const token = authHeader.substring(7);
  try {
    const { verifyAccessToken, isTokenBlacklisted } = await import('../../auth-service/src/services/token.service');
    const payload = verifyAccessToken(token);
    const blacklisted = await isTokenBlacklisted(payload.jti);
    if (blacklisted) return reply.status(401).send({ statusCode: 401, message: 'Token revoked' });
    (req as any).tokenPayload = payload;
  } catch {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired token' });
  }
}
