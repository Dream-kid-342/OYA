#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}         Oya Microcredit Platform Startup           ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

echo -e "${GREEN}➤ Step 1: Building Docker containers...${NC}"
npm run docker:build

echo -e "${GREEN}➤ Step 2: Bringing up Docker containers (PostgreSQL, Redis, Mobile App)...${NC}"
npm run docker:up

echo -e "${GREEN}➤ Step 3: Waiting for databases and caches to initialize...${NC}"
sleep 5

echo -e "${GREEN}➤ Step 4: Starting all services concurrently...${NC}"
echo -e "${MAGENTA}The following services will be started:${NC}"
echo "  - Prisma Studio       (Database GUI)"
echo "  - API Gateway         (Entry point)"
echo "  - Auth Service        (Authentication)"
echo "  - Loan Service        (Loan management)"
echo "  - Payment Service     (Payments)"
echo "  - Notification Svc    (Emails/SMS)"
echo "  - Queue Worker        (Background jobs)"
echo "  - Admin Dashboard     (Frontend UI)"
echo ""
echo -e "Press ${CYAN}Ctrl+C${NC} at any time to stop all services."
echo -e "${CYAN}====================================================${NC}"
echo ""

# Start all individual services concurrently with distinct prefixes and colors
npx concurrently \
  -n "prisma,gateway,auth,loan,payment,notify,worker,admin" \
  -c "bgBlue.bold,bgGreen.bold,bgCyan.bold,bgMagenta.bold,bgYellow.bold,bgRed.bold,bgWhite.bold,bgBlueBright.bold" \
  --prefix "[{time} {name}]" \
  --kill-others \
  "npm run db:studio -w packages/database" \
  "npm run dev -w services/api-gateway" \
  "npm run dev -w services/auth-service" \
  "npm run dev -w services/loan-service" \
  "npm run dev -w services/payment-service" \
  "npm run dev -w services/notification-service" \
  "npm run dev -w services/queue-worker" \
  "npm run dev -w apps/admin-dashboard"
