import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import { RegisterSchema, OtpSendSchema, OtpVerifySchema, LoginSchema, ChangePasswordSchema } from '../schemas/auth.schema';
import { registerUser, loginUser, refreshTokens, logoutSession, revokeAllSessions } from '../services/auth.service';
import { generateOtp, storeOtp, sendOtpSms, checkOtpSendRateLimit, verifyOtp } from '../services/otp.service';
import { validateAndNormalize } from '@oya/shared';
import { verifyAccessToken } from '../services/token.service';
import { prisma } from '@oya/database';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/auth/refresh',
};

export async function authRoutes(app: FastifyInstance) {
  // ─── POST /auth/register ────────────────────────────────
  app.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: 3600000 } }, // 10/hr per IP
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = RegisterSchema.parse(req.body);
      const user = await registerUser(body, req.ip);
      return reply.status(201).send({
        success: true,
        message: 'Registration successful. Please verify your phone number.',
        data: { userId: user.id },
      });
    },
  });

  // ─── POST /auth/otp/send ────────────────────────────────
  app.post('/otp/send', {
    config: { rateLimit: { max: 3, timeWindow: 600000 } }, // 3/10min per IP
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = OtpSendSchema.parse(req.body);
      const phone = validateAndNormalize(body.phoneNumber);

      const rateLimited = await checkOtpSendRateLimit(phone);
      if (rateLimited) {
        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'OTP send limit reached. Wait 10 minutes before requesting again.',
        });
      }

      const otp = generateOtp();
      await storeOtp(phone, otp);
      await sendOtpSms(phone, otp, body.purpose);

      return reply.send({
        success: true,
        message: 'OTP sent successfully.',
        expiresIn: 300,
      });
    },
  });

  // ─── POST /auth/otp/verify ──────────────────────────────
  app.post('/otp/verify', {
    config: { rateLimit: { max: 3, timeWindow: 600000 } },
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = OtpVerifySchema.parse(req.body);
      const phone = validateAndNormalize(body.phoneNumber);

      const result = await verifyOtp(phone, body.otp);

      if (result.locked) {
        return reply.status(429).send({
          statusCode: 429,
          error: 'OTP Locked',
          message: 'Too many failed attempts. Request a new OTP after 10 minutes.',
        });
      }

      if (!result.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Invalid OTP',
          message: `Incorrect OTP. ${result.attemptsRemaining} attempt(s) remaining.`,
        });
      }

      // Mark phone as verified if REGISTRATION purpose
      if (body.purpose === 'REGISTRATION') {
        await prisma.user.updateMany({
          where: { phoneNumber: phone, kycStatus: 'PENDING' },
          data: { kycStatus: 'PENDING' }, // Will progress through KYC workflow
        });
      }

      return reply.send({ success: true, message: 'OTP verified successfully.' });
    },
  });

  // ─── POST /auth/login ───────────────────────────────────
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: 900000 } }, // 5/15min per IP
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = LoginSchema.parse(req.body);
      const result = await loginUser(body, req.ip, req.headers['user-agent']);

      // Set refresh token in HTTP-only cookie
      reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      return reply.send({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
          sessionId: result.sessionId,
        },
      });
    },
  });

  // ─── POST /auth/admin/login ─────────────────────────────
  app.post('/admin/login', {
    config: { rateLimit: { max: 5, timeWindow: 900000 } },
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = req.body as any;
      const { loginAdmin } = await import('../services/auth.service');
      const result = await loginAdmin(body, req.ip, req.headers['user-agent']);
      
      return reply.send({
        success: true,
        data: {
          accessToken: result.accessToken,
          admin: result.admin,
        },
      });
    },
  });

  // ─── POST /auth/refresh ─────────────────────────────────
  app.post('/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = (req.body as any)?.refreshToken;
    const rawToken = tokenFromCookie || tokenFromBody;

    if (!rawToken) {
      return reply.status(401).send({ statusCode: 401, message: 'Refresh token required' });
    }

    const result = await refreshTokens(rawToken);
    reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return reply.send({
      success: true,
      data: { accessToken: result.accessToken },
    });
  });

  // ─── POST /auth/logout ──────────────────────────────────
  app.post('/logout', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const { jti, sessionId, exp } = (req as any).tokenPayload;
      await logoutSession(sessionId, jti, exp);
      reply.clearCookie('refreshToken', { path: '/auth/refresh' });
      return reply.send({ success: true, message: 'Logged out successfully' });
    },
  });

  // ─── POST /auth/logout-all ──────────────────────────────
  app.post('/logout-all', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId, jti, exp } = (req as any).tokenPayload;
      await revokeAllSessions(userId);
      reply.clearCookie('refreshToken', { path: '/auth/refresh' });
      return reply.send({ success: true, message: 'All sessions revoked' });
    },
  });

  // ─── GET /auth/sessions ─────────────────────────────────
  app.get('/sessions', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = (req as any).tokenPayload;
      const sessions = await prisma.session.findMany({
        where: { userId, isActive: true },
        select: {
          id: true, deviceName: true, deviceOs: true,
          appVersion: true, ipAddress: true, lastActiveAt: true, createdAt: true,
        },
        orderBy: { lastActiveAt: 'desc' },
      });
      return reply.send({ success: true, data: sessions });
    },
  });

  // ─── DELETE /auth/sessions/:sessionId ───────────────────
  app.delete('/sessions/:sessionId', {
    preHandler: requireAuth,
    handler: async (req: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sub: userId } = (req as any).tokenPayload;
      const { sessionId } = req.params;

      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId, isActive: true },
      });

      if (!session) {
        return reply.status(404).send({ statusCode: 404, message: 'Session not found' });
      }

      await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false, revokedAt: new Date(), refreshTokenHash: null },
      });

      return reply.send({ success: true, message: 'Session revoked' });
    },
  });
}

// ─── Auth preHandler ──────────────────────────────────────
async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ statusCode: 401, message: 'Authorization required' });
  }
  const token = authHeader.substring(7);
  try {
    const { verifyAccessToken, isTokenBlacklisted } = await import('../services/token.service');
    const payload = verifyAccessToken(token);
    const blacklisted = await isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      return reply.status(401).send({ statusCode: 401, message: 'Token revoked' });
    }
    (req as any).tokenPayload = payload;
  } catch {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired token' });
  }
}
