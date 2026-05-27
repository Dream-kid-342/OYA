import { FastifyInstance } from 'fastify';
import { prisma } from '@oya/database';
import { getRedisClient, RedisKeys } from '@oya/shared';

export default async function adminRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/customers
  fastify.get('/customers', async (request, reply) => {
    try {
      const { page = '1', limit = '20', search = '', kycStatus, status } = request.query as any;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
          { nationalId: { contains: search } },
        ];
      }
      if (kycStatus) where.kycStatus = kycStatus;
      if (status) where.status = status;

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            loans: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        }),
      ]);

      const redis = getRedisClient();
      const onlineKeys = users.map((u: any) => RedisKeys.userOnline(u.id));
      const onlineStatuses = onlineKeys.length > 0 ? await redis.mget(onlineKeys) : [];

      const data = users.map((u: any, index: number) => ({
        id: u.id,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        nationalId: u.nationalId,
        createdAt: u.createdAt,
        kycStatus: u.kycStatus,
        status: u.status,
        isOnline: onlineStatuses[index] === '1',
        businessName: u.businessDetails?.businessName || 'N/A',
        businessLocation: u.businessDetails?.businessLocation || 'N/A',
        activeLoan: u.loans.length > 0 ? {
          referenceNumber: u.loans[0].id.substring(0, 8).toUpperCase(),
          status: u.loans[0].status,
          balanceRemaining: u.loans[0].balanceRemaining,
        } : undefined,
      }));

      return reply.send({
        status: 'success',
        data,
        pagination: { total, page: pageNum, limit: limitNum },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to fetch customers' });
    }
  });

  // GET /api/v1/admin/customers/:id
  fastify.get('/customers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          loans: {
            orderBy: { createdAt: 'desc' },
            include: {
              loanProduct: { select: { name: true } },
            }
          },
          repayments: {
            orderBy: { transactionDate: 'desc' },
            take: 50, // Limit to recent 50
          },
          sessions: {
            where: { isActive: true },
            orderBy: { lastActiveAt: 'desc' },
          }
        },
      });

      if (!user) {
        return reply.status(404).send({ status: 'error', message: 'Customer not found' });
      }

      const redis = getRedisClient();
      const onlineStatus = await redis.get(RedisKeys.userOnline(user.id));
      
      const { passwordHash, ...safeUser } = user;

      return reply.send({
        status: 'success',
        data: {
          ...safeUser,
          isOnline: onlineStatus === '1',
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to fetch customer details' });
    }
  });

  // POST /api/v1/admin/customers/:id/terminate
  fastify.post('/customers/:id/terminate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      // Soft delete user and set status to DELETED
      await prisma.user.update({
        where: { id },
        data: { status: 'DELETED', deletedAt: new Date() },
      });
      // Revoke all active sessions
      await prisma.session.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });

      return reply.send({ status: 'success', message: 'User terminated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to terminate user' });
    }
  });

  // POST /api/v1/admin/customers/:id/reactivate
  fastify.post('/customers/:id/reactivate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE', deletedAt: null },
      });
      return reply.send({ status: 'success', message: 'User reactivated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to reactivate user' });
    }
  });

  // DELETE /api/v1/admin/customers/:id/erase
  fastify.delete('/customers/:id/erase', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      // Delete all related records first to avoid foreign key constraints
      await prisma.$transaction([
        prisma.session.deleteMany({ where: { userId: id } }),
        prisma.notification.deleteMany({ where: { userId: id } }),
        prisma.repayment.deleteMany({ where: { userId: id } }),
        prisma.loan.deleteMany({ where: { userId: id } }),
        prisma.paymentRequest.deleteMany({ where: { userId: id } }),
        prisma.securityEvent.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
      return reply.send({ status: 'success', message: 'User erased completely' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to erase user' });
    }
  });

  // POST /api/v1/admin/customers/:id/message
  fastify.post('/customers/:id/message', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { title, body, channel } = request.body as { title: string, body: string, channel: string };
      
      // Insert notification
      await prisma.notification.create({
        data: {
          userId: id,
          title,
          body,
          type: 'ADMIN_MESSAGE',
          sentVia: [channel],
        },
      });

      return reply.send({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to send message' });
    }
  });

  // GET /api/v1/admin/loans
  fastify.get('/loans', async (request, reply) => {
    try {
      const { page = '1', limit = '20', search = '', status } = request.query as any;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { phoneNumber: { contains: search } } },
        ];
      }
      if (status) where.status = status;

      const [total, loans] = await Promise.all([
        prisma.loan.count({ where }),
        prisma.loan.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        }),
      ]);

      const data = loans.map((l: any) => ({
        id: l.id,
        referenceNumber: l.id.substring(0, 8).toUpperCase(),
        customerName: l.user.fullName,
        customerPhone: l.user.phoneNumber,
        principalAmount: l.principalAmount,
        balanceRemaining: l.balanceRemaining,
        status: l.status,
        dueDate: l.dueDate,
        createdAt: l.createdAt,
      }));

      return reply.send({
        status: 'success',
        data,
        pagination: { total, page: pageNum, limit: limitNum },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ status: 'error', message: 'Failed to fetch loans' });
    }
  });
}
