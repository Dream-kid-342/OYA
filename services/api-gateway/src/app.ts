import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import httpProxy from '@fastify/http-proxy';
import { getRedisClient, RedisKeys } from '@oya/shared';
import { verifyAccessToken, isTokenBlacklisted } from './services/token.service';
import { prisma } from '@oya/database';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
export async function buildGateway() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    trustProxy: true,
  });

  await app.register(helmet);

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  const redis = getRedisClient();

  // Global rate limit: 100 req/60s per IP
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: 60000,
    redis,
    keyGenerator: (req) => req.ip,
  });

  // ─── Maintenance mode check ───────────────────────────
  app.addHook('onRequest', async (req, reply) => {
    const maintenanceActive = await redis.get(RedisKeys.maintenance());
    if (maintenanceActive === '1') {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'System is under maintenance. Please try again later.',
        retryAfter: 300,
      });
    }
  });

  // ─── Auth middleware (for protected routes) ───────────
  app.decorate('authenticate', async (req: any, reply: any) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ statusCode: 401, message: 'Authorization required' });
    }

    const token = header.substring(7);
    try {
      const payload = verifyAccessToken(token);
      const blacklisted = await isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        return reply.status(401).send({ statusCode: 401, message: 'Token revoked' });
      }

      // Validate session in DB
      const session = await prisma.session.findFirst({
        where: { id: payload.sessionId, isActive: true },
        select: { id: true, userId: true },
      });

      if (!session) {
        return reply.status(401).send({ statusCode: 401, message: 'Session expired' });
      }

      req.tokenPayload = payload;
    } catch {
      return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired token' });
    }
  });

  // ─── Health ───────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  }));

  // ─── Version manifest ─────────────────────────────────
  app.get('/api/version', async (req: any) => {
    const platform = req.query.platform || 'android';
    const config = await prisma.appVersionConfig.findFirst({ where: { platform } });
    return {
      minimumSupportedVersion: config?.minimumVersion || '1.0.0',
      latestVersion: config?.latestVersion || '1.0.0',
      forceUpdateBelow: config?.forceUpdateBelow || '1.0.0',
      updateMessage: config?.updateMessage,
      platform,
    };
  });

  // ─── Proxy routes to services ─────────────────────────
  await app.register(httpProxy, {
    upstream: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    prefix: '/auth',
    rewritePrefix: '/auth',
    http2: false,
    undici: false,
  });

  await app.register(httpProxy, {
    upstream: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    prefix: '/api/v1/admin/auth',
    rewritePrefix: '/auth/admin',
    http2: false,
    undici: false,
  });

  await app.register(httpProxy, {
    upstream: process.env.LOAN_SERVICE_URL || 'http://loan-service:3002',
    prefix: '/api/v1/loans',
    rewritePrefix: '/api/v1/loans',
    http2: false,
    undici: false,
  });

  await app.register(httpProxy, {
    upstream: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003',
    prefix: '/payments',
    rewritePrefix: '/payments',
    http2: false,
    undici: false,
  });

  await app.register(httpProxy, {
    upstream: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
    prefix: '/api/v1/notifications',
    rewritePrefix: '/notifications',
    http2: false,
    undici: false,
  });

  // ─── Admin Dashboard Routes ──────────────────────────────
  await app.register(dashboardRoutes, {
    prefix: '/api/v1/admin/dashboard',
  });

  // ─── Admin Data Routes ──────────────────────────────
  await app.register(adminRoutes, {
    prefix: '/api/v1/admin',
  });

  // ─── Prometheus metrics ───────────────────────────────
  app.get('/metrics', async (req, reply) => {
    // Expose basic metrics — integrate prom-client here
    return reply.send('# Prometheus metrics\n');
  });

  return app;
}

async function start() {
  const app = await buildGateway();
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`✅ api-gateway running on port ${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
