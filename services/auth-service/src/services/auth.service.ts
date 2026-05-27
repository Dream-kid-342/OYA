import * as argon2 from 'argon2';
import { prisma } from '@oya/database';
import { validateAndNormalize, validateNationalId, getRedisClient, RedisKeys, RedisTTL, getAuditLogsQueue, getNotificationsQueue } from '@oya/shared';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { issueAccessToken, issueRefreshToken, hashDeviceFingerprint, blacklistToken } from './token.service';
import { generateOtp, storeOtp, sendOtpSms } from './otp.service';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ─── Argon2id config (preferred) ─────────────────────────
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  type: argon2.argon2id,
};

// ─── Registration ─────────────────────────────────────────
export async function registerUser(input: RegisterInput, ipAddress?: string) {
  const phone = validateAndNormalize(input.phoneNumber);

  const idValidation = validateNationalId(input.nationalId);
  if (!idValidation.valid) throw new Error(idValidation.error);

  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { phoneNumber: phone },
        { nationalId: input.nationalId },
      ],
      deletedAt: null,
    },
  });

  if (existing) {
    if (existing.phoneNumber === phone) throw new Error('Phone number already registered');
    throw new Error('National ID already registered');
  }

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      nationalId: input.nationalId,
      phoneNumber: phone,
      passwordHash,
      businessName: input.businessName,
      businessType: input.businessType as any,
      businessLocation: input.businessLocation,
      businessDescription: input.businessDescription,
    },
    select: {
      id: true, fullName: true, phoneNumber: true,
      businessName: true, kycStatus: true, status: true, createdAt: true,
    },
  });

  // Queue audit log
  await getAuditLogsQueue().add('user.registered', {
    actorType: 'USER',
    actorId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'users',
    entityId: user.id,
    ipAddress,
  });

  return user;
}

// ─── Login ───────────────────────────────────────────────
export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const phone = validateAndNormalize(input.phoneNumber);

  // Check IP ban
  const redis = getRedisClient();
  const banned = await redis.exists(RedisKeys.ipBan(ipAddress || ''));
  if (banned) throw Object.assign(new Error('Too many failed attempts. Try again later.'), { statusCode: 429 });

  let user = await prisma.user.findFirst({
    where: { phoneNumber: phone, deletedAt: null },
    select: { id: true, fullName: true, phoneNumber: true, passwordHash: true, status: true, kycStatus: true, fcmToken: true },
  });

  const failKey = RedisKeys.loginFailCount(ipAddress || '');

  if (!user) {
    let supabaseUser = null;
    const supabaseMissingKey = `supabase:missing:${phone}`;
    const isMissing = await redis.get(supabaseMissingKey);
    
    if (!isMissing && supabase) {
      const { data } = await supabase.auth.signInWithPassword({
        phone: phone,
        password: input.password,
      });
      if (data && data.user) {
        supabaseUser = data.user;
      } else {
        await redis.set(supabaseMissingKey, '1', 'EX', 3600); // Cache miss for 1 hour
      }
    }

    if (supabaseUser) {
      const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
      user = await prisma.user.create({
        data: {
          fullName: supabaseUser.user_metadata?.full_name || 'Imported User',
          nationalId: supabaseUser.user_metadata?.national_id || Math.floor(10000000 + Math.random() * 90000000).toString(),
          phoneNumber: phone,
          passwordHash,
          kycStatus: 'PENDING',
        },
        select: { id: true, fullName: true, phoneNumber: true, passwordHash: true, status: true, kycStatus: true, fcmToken: true }
      });
    } else {
      await redis.incr(failKey);
      await redis.expire(failKey, RedisTTL.RATE_LOGIN);
      await handleLoginFailure(ipAddress || '', null, phone);
      throw Object.assign(new Error('Invalid phone number or password'), { statusCode: 401 });
    }
  }

  if (user.status === 'SUSPENDED') {
    throw Object.assign(new Error('Account suspended. Contact support.'), { statusCode: 403 });
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    const failCount = await redis.incr(failKey);
    await redis.expire(failKey, RedisTTL.RATE_LOGIN);
    await handleLoginFailure(ipAddress || '', user.id, phone, failCount);
    throw Object.assign(new Error('Invalid phone number or password'), { statusCode: 401 });
  }

  // Clear fail counter on success
  await redis.del(failKey);

  // Compose device fingerprint
  const fingerprintRaw = [
    input.deviceName || 'unknown',
    input.deviceOs || 'unknown',
    input.appVersion || '0.0.0',
    input.deviceFingerprint || 'no-uuid',
  ].join('|');
  const fingerprint = hashDeviceFingerprint(fingerprintRaw);

  // Create or update session
  const session = await prisma.session.upsert({
    where: {
      // We use a pseudo-unique key; Prisma requires a unique field
      // Use a composite approach: find existing active session for this device
      id: (await prisma.session.findFirst({
        where: { userId: user.id, deviceFingerprint: fingerprint, isActive: true },
        select: { id: true },
      }))?.id || '00000000-0000-0000-0000-000000000000',
    },
    update: {
      lastActiveAt: new Date(),
      appVersion: input.appVersion,
      ipAddress,
    },
    create: {
      userId: user.id,
      deviceFingerprint: fingerprint,
      deviceName: input.deviceName,
      deviceOs: input.deviceOs,
      appVersion: input.appVersion,
      ipAddress,
      isActive: true,
    },
  });

  const accessToken = issueAccessToken(user.id, session.id);
  const { raw: refreshToken, hash: refreshHash } = issueRefreshToken();

  // Store refresh token hash in session
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: refreshHash },
  });

  // Queue new device notification if new session
  await getNotificationsQueue().add('new-device-login', {
    userId: user.id,
    title: 'New Device Login',
    body: `A new login was detected from ${input.deviceName || 'a new device'}.`,
    type: 'SECURITY',
    channels: ['PUSH', 'SMS'],
    phone: user.phoneNumber,
    fcmToken: user.fcmToken || undefined,
  });

  // Queue audit log
  await getAuditLogsQueue().add('user.login', {
    actorType: 'USER',
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'sessions',
    entityId: session.id,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      status: user.status,
    },
    sessionId: session.id,
  };
}

// ─── Refresh Token ────────────────────────────────────────
export async function refreshTokens(rawRefreshToken: string) {
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: hash, isActive: true },
    include: { user: { select: { id: true, status: true, deletedAt: true } } },
  });

  if (!session || !session.user) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  if (session.user.status === 'SUSPENDED' || session.user.deletedAt) {
    throw Object.assign(new Error('Account suspended'), { statusCode: 403 });
  }

  // Rotate refresh token
  const { raw: newRefreshToken, hash: newHash } = issueRefreshToken();

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: newHash, lastActiveAt: new Date() },
  });

  const accessToken = issueAccessToken(session.userId, session.id);

  return { accessToken, refreshToken: newRefreshToken };
}

// ─── Logout ───────────────────────────────────────────────
export async function logoutSession(sessionId: string, jti: string, exp: number) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false, revokedAt: new Date(), refreshTokenHash: null },
  });
  await blacklistToken(jti, exp);
}

// ─── Revoke all sessions ──────────────────────────────────
export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, revokedAt: new Date(), refreshTokenHash: null },
  });
  // Note: existing access tokens expire naturally via their short TTL (15 min)
  // For immediate revocation, sessions table is checked on each request
}

// ─── Login failure handler ───────────────────────────────
async function handleLoginFailure(
  ip: string,
  userId: string | null,
  phone: string,
  failCount?: number,
) {
  const redis = getRedisClient();
  const count = failCount ?? parseInt((await redis.get(RedisKeys.loginFailCount(ip))) || '0', 10);

  // Store security event
  if (userId) {
    await prisma.securityEvent.create({
      data: {
        eventType: 'FAILED_LOGIN',
        ipAddress: ip,
        userId,
        metadata: { phone, failCount: count },
      },
    });
  }

  // Ban IP after 5 failures for 15 min
  if (count >= 5 && count < 20) {
    await redis.set(RedisKeys.ipBan(ip), '1', 'EX', RedisTTL.IP_BAN_SHORT);
  }

  // Ban IP for 24 hours after 20 failures
  if (count >= 20) {
    await redis.set(RedisKeys.ipBan(ip), '1', 'EX', RedisTTL.IP_BAN_LONG);
    // TODO: Alert admin dashboard via Redis pub/sub
  }
}

// ─── Admin Login ───────────────────────────────────────────
export async function loginAdmin(
  input: { email: string; password: string },
  ipAddress?: string,
  userAgent?: string,
) {
  const redis = getRedisClient();
  const banned = await redis.exists(RedisKeys.ipBan(ipAddress || ''));
  if (banned) throw Object.assign(new Error('Too many failed attempts.'), { statusCode: 429 });

  const admin = await prisma.admin.findFirst({
    where: { email: input.email, deletedAt: null },
  });

  const failKey = RedisKeys.loginFailCount(ipAddress || '');

  if (!admin) {
    await redis.incr(failKey);
    await redis.expire(failKey, RedisTTL.RATE_LOGIN);
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!admin.isActive) {
    throw Object.assign(new Error('Admin account deactivated.'), { statusCode: 403 });
  }

  const passwordValid = await argon2.verify(admin.passwordHash, input.password);
  if (!passwordValid) {
    await redis.incr(failKey);
    await redis.expire(failKey, RedisTTL.RATE_LOGIN);
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  await redis.del(failKey);

  // Admin JWT doesn't use the User session table
  const accessToken = issueAccessToken(admin.id, 'admin-session');
  
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    admin: {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    },
  };
}
