# Backend & Web Server Documentation

The backend of the OYA platform operates as a suite of decoupled microservices, an API Gateway, and a React Admin Dashboard. The system prioritizes speed, type-safety, and strict relational data integrity.

## Core Technologies
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript
- **Framework:** Fastify (Chosen for being significantly faster and lower-overhead than Express.js)
- **Database ORM:** Prisma
- **Message Queueing:** BullMQ (Backed by Redis)

## Service Breakdown

### 1. API Gateway (`services/api-gateway`)
The API Gateway sits at the edge of the backend network.
- **Port:** 3000
- **Responsibilities:** 
  - Validates `Bearer` tokens via JSON Web Tokens (JWT).
  - Enforces global rate-limiting (maximum of 100 requests per 60 seconds per IP) using Redis.
  - Rejects requests if the system is marked under maintenance.
  - Uses `@fastify/http-proxy` to seamlessly pass validated traffic to downstream microservices.
  - Serves administrative routes (`/api/v1/admin/*`) directly to the Admin Dashboard.

### 2. Authentication Service (`services/auth-service`)
- **Port:** 3001
- **Responsibilities:** Manages user creation, session issuing, and password hashing. Uses Redis to cache active sessions, allowing the API gateway to perform sub-millisecond session validation without querying the main SQL database.

### 3. Loan Service (`services/loan-service`)
- **Port:** 3002
- **Responsibilities:** 
  - Evaluates loan limits and user eligibility (e.g., rejecting users with "DEFAULTED" loans).
  - Processes `POST /api/v1/loans/apply` requests.
  - Generates installment schedules.

### 4. Admin Dashboard (`apps/admin-dashboard`)
- **Port:** 5173 (Vite Development / Production Build Server)
- **Responsibilities:** A React SPA built with Vite. Staff can monitor the platform, view total active users, track total disbursed loan amounts, and manually approve or reject pending loans. Connects directly to the API Gateway.

## Database & Prisma
We use a single unified `schema.prisma` file located at `packages/database/prisma/schema.prisma`. 
All microservices import the compiled Prisma client from the `@oya/database` internal workspace package. This guarantees 100% type-safety across the monorepo; if a column is renamed in the schema, the TypeScript compiler will immediately flag all microservices that use it.
