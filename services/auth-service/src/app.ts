import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import * as Sentry from '@sentry/node';
import { getRedisClient } from '@oya/shared';
import { authRoutes } from './routes/auth.routes';

const logger = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};

export async function buildApp() {
  // Init Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  }

  const app = Fastify({ logger, trustProxy: true });

  // ─── Security headers ────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // ─── CORS ────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Cookies ─────────────────────────────────────────────
  await app.register(cookie, {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    hook: 'onRequest',
  });

  // ─── Redis-backed rate limiting ───────────────────────────
  const redis = getRedisClient();
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: 60000, // 60 seconds
    redis,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
    }),
  });

  // ─── Health check ────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  }));

  // ─── Routes ──────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });

  // ─── Error handler ───────────────────────────────────────
  app.setErrorHandler((error: any, req, reply) => {
    if (error.name === 'ZodError' || error.issues) {
      req.log.warn({ url: req.url }, 'Validation error');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.issues || error.message,
      });
    }

    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    req.log.error({ err: error, url: req.url }, 'Unhandled error');

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3001', 10);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`✅ auth-service running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
