import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users over 30s
    { duration: '1m', target: 50 },   // Stay at 50 users for 1m
    { duration: '30s', target: 100 }, // Ramp up to 100 users over 30s
    { duration: '1m', target: 100 },  // Stay at 100 users for 1m
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check endpoint (to test Gateway & Rate Limiter overhead)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Auth endpoint simulation (testing payload parsing and generic routing)
  const loginPayload = JSON.stringify({
    phoneNumber: '+254712345678',
    password: 'Password123!',
  });
  
  const loginHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-load-test',
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers: loginHeaders });
  
  // Note: We expect 401 or 400 since we're using dummy credentials, 
  // but we're testing the system's ability to handle the load and not crash.
  check(loginRes, {
    'login responds': (r) => r.status !== 500 && r.status !== 502 && r.status !== 503,
  });

  sleep(1);
}
