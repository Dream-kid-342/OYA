import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';

// Mock dependencies if any
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: { cert: vi.fn() },
  messaging: () => ({
    send: vi.fn(),
  }),
}));

describe('Notification Service Security', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should expose health check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });
});
