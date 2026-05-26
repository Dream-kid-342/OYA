import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { logAdminAction } from '../queue';

export interface AuditPluginOptions {
  ignoreRoutes?: string[];
}

const auditPlugin: FastifyPluginAsync<AuditPluginOptions> = async (fastify, options) => {
  fastify.addHook('onResponse', async (request, reply) => {
    // Only log state-changing methods
    if (['GET', 'OPTIONS', 'HEAD'].includes(request.method)) return;

    // Skip ignored routes
    if (options.ignoreRoutes?.includes(request.routerPath)) return;

    // Check if there is an admin authenticated on this request
    const adminToken = (request as any).adminPayload;
    if (!adminToken) return;

    // Attempt to parse out action from route
    const action = `${request.method} ${request.routerPath || request.url}`;
    const entityType = request.routerPath?.split('/')[2]?.toUpperCase() || 'UNKNOWN';
    const entityId = (request.params as any)?.id || null;

    try {
      await logAdminAction({
        actorId: adminToken.sub || adminToken.id,
        action,
        entityType,
        entityId,
        newValues: request.body as Record<string, any>,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      request.log.error(err, 'Failed to enqueue admin audit log');
    }
  });
};

export default fp(auditPlugin, {
  name: 'oya-audit-plugin',
});
