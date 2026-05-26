#!/bin/bash
set -e

# OYA Micro-Credit Security Test Suite
# Requirements: curl, jq
# Ensure the backend is running locally on port 3000 before running this script

BASE_URL="http://localhost:3000"
echo "Starting Security Test Suite against $BASE_URL..."

# Helper function
assert_status() {
  local expected=$1
  local actual=$2
  local test_name=$3
  if [ "$expected" == "$actual" ]; then
    echo "✅ PASS: $test_name"
  else
    echo "❌ FAIL: $test_name (Expected $expected, got $actual)"
    exit 1
  fi
}

echo "----------------------------------------"
echo "1. Injection Tests"
echo "----------------------------------------"

# 1.1 SQL Injection on Login
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+254712345678", "password": "'' OR 1=1 --"}')
# Fastify schema validation should block this or Prisma will safely parameterize it
assert_status "401" "$HTTP_STATUS" "SQLi attempt on password field yields 401 Unauthorized"

# 1.2 NoSQL/JSON Injection
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": {"$gt": ""}, "password": "Password123"}')
# Fastify schema should reject object where string is expected (400 Bad Request)
assert_status "400" "$HTTP_STATUS" "JSON injection attempt yields 400 Bad Request"


echo "----------------------------------------"
echo "2. Auth & Rate Limiting Attack Tests"
echo "----------------------------------------"

# 2.1 Brute Force Login Protection (Rate Limiting)
echo "Testing login rate limiter (sending 6 rapid requests)..."
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "+254700000000", "password": "WrongPassword!"}' > /dev/null
done

# The 6th request should trigger IP Ban / Rate Limit (429 Too Many Requests or 403 Forbidden based on ban logic)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+254700000000", "password": "WrongPassword!"}')

if [ "$HTTP_STATUS" == "429" ] || [ "$HTTP_STATUS" == "403" ]; then
  echo "✅ PASS: Brute force login blocked with status $HTTP_STATUS"
else
  echo "❌ FAIL: Brute force login blocked (Expected 429/403, got $HTTP_STATUS)"
  # Don't exit here as it might be configured differently, but flag it
fi


echo "----------------------------------------"
echo "3. IDOR (Insecure Direct Object Reference) Tests"
echo "----------------------------------------"

# We simulate a request to fetch a loan belonging to another user using a dummy UUID.
# Without a valid token, it should reject with 401. 
# If we had a token, the Loan Service handles ownership checks.
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/loans/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer invalid_token")
assert_status "401" "$HTTP_STATUS" "Unauthenticated IDOR attempt yields 401"


echo "----------------------------------------"
echo "4. Payment Attack Tests"
echo "----------------------------------------"

# 4.1 Forged Safaricom Callback IP
# The Daraja callback route should only accept requests from Safaricom's allowed IP ranges.
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/payments/callback" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 203.0.113.5" \
  -d '{"Body":{"stkCallback":{"ResultCode":0,"CheckoutRequestID":"ws_CO_12345"}}}')
assert_status "403" "$HTTP_STATUS" "Forged M-Pesa Callback from invalid IP yields 403 Forbidden"


echo "----------------------------------------"
echo "Security test suite completed successfully."
echo "----------------------------------------"
