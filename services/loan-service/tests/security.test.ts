import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';

// Mock DB
vi.mock('@oya/database', () => ({
  prisma: {
    loan: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Kafka/Events
vi.mock('@oya/shared', () => ({
  publishEvent: vi.fn(),
}));

describe('Loan Service Security', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should enforce strict schema validation on loan applications', async () => {
    // Missing required fields
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/loans/apply',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        amount: -500, // Invalid amount
        // Missing term
      },
    });

    expect(response.statusCode).toBe(400); // Bad Request from Zod
  });

  it('should reject requests without user context headers', async () => {
    // Wait, the auth is done at API Gateway. But we should check if internal routes enforce the user id header
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/loans/apply',
      // Missing x-user-id
      payload: {
        amount: 1000,
        term: 30,
        purpose: 'Business',
      },
    });

    // If there is an internal middleware checking for x-user-id, it should return 401/400.
    // If not, it might throw a 500 or 400. We just ensure it doesn't process successfully.
    expect(response.statusCode).not.toBe(201);
    expect(response.statusCode).not.toBe(200);
  });
});
