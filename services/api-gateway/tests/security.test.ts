import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildGateway } from '../src/app';

vi.mock('@fastify/rate-limit', () => {
  const fp = require('fastify-plugin');
  return {
    default: fp(async function (fastify: any, opts: any) {
      let count = 0;
      fastify.addHook('onRequest', (req: any, reply: any, done: any) => {
        count++;
        if (count > opts.max) {
          reply.status(429).send({ error: 'Too Many Requests' });
          return;
        }
        done();
      });
    })
  };
});

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
  defineCommand: vi.fn(),
};

// Mock shared dependencies
vi.mock('@oya/shared', () => ({
  getRedisClient: () => mockRedis,
  RedisKeys: {
    maintenance: () => 'maintenance',
    userOnline: (id: string) => `user:online:${id}`,
  },
  RedisTTL: {
    USER_ONLINE: 300,
  },
}));

// Mock database
vi.mock('@oya/database', () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock token service
vi.mock('../src/services/token.service', () => ({
  verifyAccessToken: vi.fn(),
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
}));

describe('API Gateway Security', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildGateway();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 401 Unauthorized for missing token on protected routes', async () => {
    // Assuming /dashboard/overview is protected
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard/stats',
    });
    
    // Some routes might not exist in the mock, but the auth hook runs first
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      statusCode: 401,
      message: 'Authorization required',
    });
  });

  it('should return 503 if maintenance mode is active', async () => {
    // Override mock to simulate maintenance mode
    const { getRedisClient } = await import('@oya/shared');
    const mockRedis = getRedisClient();
    (mockRedis.get as any).mockResolvedValueOnce('1');

    const response = await app.inject({
      method: 'GET',
      url: '/health', // Even health is blocked by maintenance in the current setup
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.payload)).toMatchObject({
      error: 'Service Unavailable',
    });
  });

  it('should enforce global rate limits (429)', async () => {
    // Make 101 requests from the same IP
    const promises = [];
    for (let i = 0; i < 101; i++) {
      promises.push(
        app.inject({
          method: 'GET',
          url: '/health',
          remoteAddress: '192.168.1.100',
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const tooManyRequests = responses.filter((r: any) => r.statusCode === 429);
    
    // Depending on timing, fastify-rate-limit might catch exact counts
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
