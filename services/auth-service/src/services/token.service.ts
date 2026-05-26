import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getRedisClient, RedisKeys } from '@oya/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME';
const ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL || '900', 10);    // 15 min
const REFRESH_TTL = parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10); // 30 days

export interface AccessTokenPayload {
  sub: string;       // user ID
  jti: string;       // JWT ID for blacklisting
  sessionId: string;
  type: 'ACCESS';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'REFRESH';
  iat?: number;
  exp?: number;
}

/**
 * Issue a new JWT access token.
 */
export function issueAccessToken(userId: string, sessionId: string): string {
  const jti = crypto.randomUUID();
  const payload: AccessTokenPayload = {
    sub: userId,
    jti,
    sessionId,
    type: 'ACCESS',
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
    algorithm: 'HS256',
  });
}

/**
 * Issue a new refresh token (opaque random token, hashed before storage).
 */
export function issueRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/**
 * Verify access token. Returns payload or throws.
 * Rejects alg:none and other unsupported algorithms.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  }) as AccessTokenPayload;

  if (payload.type !== 'ACCESS') {
    throw new Error('Invalid token type');
  }

  return payload;
}

/**
 * Add a token JTI to the Redis blacklist.
 * TTL = remaining lifetime of the token.
 */
export async function blacklistToken(jti: string, expiresAt: number): Promise<void> {
  const redis = getRedisClient();
  const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  if (ttl > 0) {
    await redis.set(RedisKeys.tokenBlacklist(jti), '1', 'EX', ttl);
  }
}

/**
 * Check if a JTI is blacklisted.
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const redis = getRedisClient();
  const exists = await redis.exists(RedisKeys.tokenBlacklist(jti));
  return exists === 1;
}

/**
 * Hash a device fingerprint composite string with SHA-256.
 */
export function hashDeviceFingerprint(composite: string): string {
  return crypto.createHash('sha256').update(composite).digest('hex');
}
