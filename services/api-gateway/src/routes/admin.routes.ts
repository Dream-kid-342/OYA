import { FastifyInstance } from 'fastify';
import { prisma } from '@oya/database';

export default async function adminRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/customers
  fastify.get('/customers', async (request, reply) => {
    try {
      const { page = '1', limit = '20', search = '', kycStatus, status } = request.query as any;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { role: 'USER' };
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

      const data = users.map((u: any) => ({
        id: u.id,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        nationalId: u.nationalId,
        createdAt: u.createdAt,
        kycStatus: u.kycStatus,
        status: u.status,
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
