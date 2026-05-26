import { FastifyInstance } from 'fastify';
import { dashboardService } from '../services/dashboard.service';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      return reply.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        status: 'error',
        message: 'Failed to fetch dashboard stats',
      });
    }
  });
}
