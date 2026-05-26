import { FastifyInstance } from 'fastify';
import { createLoanApplication, getLoanById } from '../services/loan.service';
import { prisma } from '@oya/database';

export default async function loanRoutes(app: FastifyInstance) {
  app.post('/apply', async (request, reply) => {
    const { userId, loanProductId, principalAmount, purpose, monthlyRevenue, numberOfEmployees } = request.body as any;

    if (!userId || !principalAmount) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing required fields' });
    }

    try {
      // If loanProductId is missing, find a default one (fallback)
      let productId = loanProductId;
      if (!productId) {
        const product = await prisma.loanProduct.findFirst({ where: { isActive: true } });
        if (!product) {
          return reply.status(400).send({ error: 'Bad Request', message: 'No active loan products found' });
        }
        productId = product.id;
      }

      const loan = await createLoanApplication(userId, {
        loanProductId: productId,
        principalAmount: Number(principalAmount),
        purpose: purpose || 'OTHER',
        monthlyRevenue: monthlyRevenue ? Number(monthlyRevenue) : undefined,
        numberOfEmployees: numberOfEmployees ? Number(numberOfEmployees) : undefined,
      }, request.ip);

      return reply.status(201).send(loan);
    } catch (error: any) {
      app.log.error(error);
      return reply.status(error.statusCode || 500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  app.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const loans = await prisma.loan.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(loans);
  });
}
