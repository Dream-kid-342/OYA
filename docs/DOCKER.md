# Docker Containers & Infrastructure

The OYA platform uses **Docker** and **Docker Compose** to containerize every single piece of the application stack. This ensures that the platform runs identically on a developer's Windows laptop, a macOS machine, or a production Linux server.

## Overview of the `docker-compose.yml`

The compose file orchestrates a fleet of specialized containers:

### 1. Databases & Caching
- **`postgres`:** Runs `postgres:15-alpine`. It persists data to a named Docker volume (`postgres_data`) so that your loans and users survive container restarts.
- **`redis`:** Runs `redis:7-alpine`. Used for in-memory session caching, rate limiting, and message queueing.

### 2. Microservices
- **`api-gateway`, `auth-service`, `loan-service`, etc.:** These containers are built using lightweight Node.js base images (`node:20-alpine`). They use Turborepo internally to only compile and run their specific workspace package.

### 3. Frontends
- **`admin-dashboard`:** Runs a lightweight Node server or Nginx container hosting the compiled React Vite SPA.
- **`mobile-app`:** The ultimate containerization achievement! It uses a multi-stage Dockerfile:
  1. Pulls Ubuntu and installs the massive Flutter SDK.
  2. Compiles the Dart codebase to a highly-optimized Web bundle (`build/web`).
  3. Copies the bundle into a tiny alpine `nginx` image and throws away the bulky SDK.
  4. Hosts the app on port `8080`.

### 4. Observability Stack
- **`loki`:** Grafana Loki handles log aggregation. All microservices use the Docker Loki log driver to ship their logs here.
- **`promtail`:** Scrapes local files or streams logs and forwards them to Loki.
- **`prometheus`:** Scrapes numerical metrics from the `/metrics` endpoints of our Node microservices.
- **`grafana`:** A visual dashboard that connects to Loki and Prometheus to visualize system health, CPU usage, and log streams.

## Managing Containers

**Viewing running containers:**
```bash
docker ps
```

**Restarting a specific service (e.g., loan-service):**
```bash
docker-compose restart loan-service
```

**Rebuilding a container after code changes:**
```bash
docker-compose up --build -d loan-service
```
*(Using the `-d` flag runs them in the background, keeping your terminal free).*
