export function verifyAccessToken(token: string): any {
  // Mock validation
  return { jti: 'mock-jti', sessionId: 'mock-session', userId: 'mock-user' };
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  // Mock validation
  return false;
}
