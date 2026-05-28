#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   Oya Microcredit Platform — Fully Dockerized     ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

# Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${RED}✖ Error: .env file not found! Please copy .env.example to .env and configure it.${NC}"
  exit 1
fi

echo -e "${GREEN}➤ Step 1: Stopping existing containers...${NC}"
docker compose down --remove-orphans

echo -e "${GREEN}➤ Step 2: Building all service images...${NC}"
docker compose build

echo -e "${GREEN}➤ Step 3: Starting PostgreSQL and Redis...${NC}"
docker compose up -d postgres redis

echo -e "${GREEN}➤ Step 4: Waiting for database to be ready...${NC}"
until docker compose exec postgres pg_isready -U postgres >/dev/null 2>&1; do
  echo -e "${YELLOW}... waiting for postgres to start ...${NC}"
  sleep 2
done
echo -e "${GREEN}✔ Database is ready!${NC}"

echo -e "${GREEN}➤ Step 5: Running database migrations inside container...${NC}"
docker compose run --rm api-gateway npm run db:migrate

echo -e "${GREEN}➤ Step 6: Seeding database inside container...${NC}"
docker compose run --rm api-gateway npm run db:seed || echo -e "${YELLOW}ℹ Database seeding skipped or failed (this is normal if already seeded).${NC}"

echo -e "${GREEN}➤ Step 7: Starting the entire stack (All microservices, Admin, Mobile, Nginx, Monitoring)...${NC}"
docker compose up -d

echo -e "${GREEN}✔ Stack successfully brought up in the background!${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${MAGENTA}Access URLs:${NC}"
echo "  - Nginx Entry Point / API: http://localhost"
echo "  - Mobile Web App:         http://localhost:8080"
echo "  - Admin Dashboard:        http://localhost:5173"
echo "  - Prometheus (Metrics):    http://localhost:9090"
echo "  - Grafana (Dashboards):   http://localhost:3030 (default credentials)"
echo -e "${CYAN}====================================================${NC}"
echo ""
echo -e "${GREEN}➤ Streaming container logs now. Press Ctrl+C at any time to stop streaming (services will keep running).${NC}"
docker compose logs -f
