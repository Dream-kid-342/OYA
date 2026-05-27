import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';

// Mock DB
vi.mock('@oya/database', () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    loan: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@oya/shared', () => ({
  publishEvent: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../loan-service/src/services/repayment-schedule.service', () => ({
  applyPaymentToInstallments: vi.fn(),
}));

describe('Payment Service Security', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject malformed payment init requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/initiate',
      headers: {
        'x-user-id': 'user-123',
      },
      payload: {
        amount: -100, // Invalid amount
        // Missing loanId
      },
    });

    // We expect a validation failure or auth rejection
    expect([400, 401]).toContain(response.statusCode);
  });

  it('should ensure M-PESA callbacks handle unknown transactions gracefully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/callback',
      payload: {
        Body: {
          stkCallback: {
            ResultCode: 0,
            CheckoutRequestID: 'invalid_id',
            CallbackMetadata: {
              Item: [{ Name: 'Amount', Value: 100 }],
            },
          },
        },
      },
    });

    // Should return 200 to acknowledge receipt to M-PESA even if transaction not found,
    // to prevent M-PESA from retrying endlessly.
    expect(response.statusCode).toBe(200);
  });
});
