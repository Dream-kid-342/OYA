// ─── Redis Key Patterns ───────────────────────────────────
// All keys centralized to prevent typos and enable easy auditing

export const RedisKeys = {
  // OTP
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp_attempts:${phone}`,

  // Rate Limiting
  rateLimitLogin: (ip: string) => `rl:login:${ip}`,
  rateLimitRegister: (ip: string) => `rl:register:${ip}`,
  rateLimitOtpSend: (phone: string) => `rl:otp_send:${phone}`,
  rateLimitOtpVerify: (phone: string) => `rl:otp_verify:${phone}`,
  rateLimitApi: (ip: string) => `rl:api:${ip}`,
  rateLimitPayment: (userId: string) => `rl:payment:${userId}`,

  // Auth
  tokenBlacklist: (jti: string) => `blacklist:${jti}`,
  sessionCache: (sessionId: string) => `session:${sessionId}`,

  // Abuse / IP Ban
  ipBan: (ip: string) => `ban:ip:${ip}`,
  loginFailCount: (ip: string) => `fail:login:${ip}`,

  // Idempotency
  idempotency: (key: string) => `idempotency:${key}`,

  // Cache
  loanBalance: (loanId: string) => `loan_balance:${loanId}`,
  userCache: (userId: string) => `user:${userId}`,
  loanCache: (loanId: string) => `loan:${loanId}`,

  // Maintenance
  maintenance: () => 'maintenance:active',

  // Queue metrics
  queueMetrics: (queueName: string) => `queue:metrics:${queueName}`,

  // DDoS tracking
  ddosTopIps: () => 'ddos:top_ips',
  ddosRequestCount: (ip: string) => `ddos:count:${ip}`,
} as const;

// ─── TTLs (seconds) ───────────────────────────────────────
export const RedisTTL = {
  OTP: 300,           // 5 minutes
  OTP_ATTEMPTS: 600,  // 10 minutes
  RATE_LOGIN: 900,    // 15 minutes
  RATE_REGISTER: 3600, // 1 hour
  RATE_OTP: 600,      // 10 minutes
  RATE_API: 60,       // 1 minute
  RATE_PAYMENT: 60,   // 1 minute
  IP_BAN_SHORT: 900,  // 15 minutes (5 failures)
  IP_BAN_LONG: 86400, // 24 hours (20 failures)
  IDEMPOTENCY: 300,   // 5 minutes
  SESSION_CACHE: 1800, // 30 minutes
  LOAN_BALANCE: 300,  // 5 minutes
  USER_CACHE: 3600,   // 1 hour
  LOAN_CACHE: 300,    // 5 minutes
  QUEUE_METRICS: 60,  // 1 minute
} as const;
