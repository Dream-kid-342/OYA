# OYA System Documentation Hub

Welcome to the OYA Loan Management System! This project is a massive, highly scalable, full-stack microservices platform designed for digital fintech lending.

Because the system is large and heavily containerized, we have split the documentation into comprehensive, detailed guides. Please refer to the links below to understand each aspect of the system.

---

## 📚 Documentation Directory

### System Architecture & Design
*Understand the high-level design, how the microservices communicate, and the data flow.*
👉 **[Read the System Architecture Guide](docs/ARCHITECTURE.md)**

### Installation Guide
*A complete walkthrough on how to install prerequisites, clone the repository, and bootstrap the workspace.*
👉 **[Read the Installation Guide](docs/INSTALLATION.md)**

### Starting & Running the System
*How to use Docker Compose to start the entire system (Databases, Backends, Frontends, Observability) with a single command.*
👉 **[Read the Start & Run Guide](docs/START_AND_RUN.md)**

### Mobile Application
*Deep dive into the Flutter mobile app, state management with Riverpod, routing, Premium Fintech Aesthetics, and how it gets containerized via Nginx.*
👉 **[Read the Mobile App Documentation](docs/MOBILE_APP.md)**

### Backend & Web Servers
*Explore the Node.js/Fastify microservices (`api-gateway`, `loan-service`, `auth-service`), the Prisma Postgres schema, and the React Admin Dashboard.*
👉 **[Read the Backend Documentation](docs/BACKEND.md)**

### Docker Containers & Infrastructure
*Understand exactly what each container does in the `docker-compose.yml`, from Redis to Grafana.*
👉 **[Read the Docker Documentation](docs/DOCKER.md)**

### Networking & Ports
*Confused about CORS or which port does what? Learn how the internal Docker network bridges the microservices and which ports are exposed to localhost.*
👉 **[Read the Networking Guide](docs/NETWORKING.md)**

### Troubleshooting & Checking Errors
*Learn how to view container logs manually via the Docker CLI or using the centralized Grafana Loki UI. Includes solutions to common problems.*
👉 **[Read the Troubleshooting Guide](docs/TROUBLESHOOTING.md)**

---

## 🚀 Quick Start
If you just want to get it running immediately:
1. `cp .env.example .env`
2. `npm install`
3. `npx turbo run generate`
4. `docker-compose up --build -d`
5. Open [http://localhost:8080](http://localhost:8080) for the Mobile App or [http://localhost:5173](http://localhost:5173) for the Admin Dashboard!
