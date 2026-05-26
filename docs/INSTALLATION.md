# Installation Guide

Follow these steps to set up the OYA system on a fresh machine.

## Prerequisites
Ensure the following tools are installed on your machine:
1. **Node.js** (v20 or higher) - Required for local package management and running Turbo.
2. **Git** - For cloning the repository.
3. **Docker Desktop** (or Docker Engine + Docker Compose) - Mandatory for spinning up the full stack.

*(Note: You do NOT need the Flutter SDK, Android Studio, or Postgres installed locally on your machine. Docker handles all of this internally.)*

## Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Dream-kid-342/OYA.git
cd OYA
```

### 2. Configure Environment Variables
The system requires a `.env` file at the root of the project to configure database connection strings, JWT secrets, and port mappings.

Copy the provided example file:
```bash
cp .env.example .env
```
Open `.env` in your text editor and ensure the `DATABASE_URL` matches the internal Docker routing:
```env
DATABASE_URL="postgresql://oya:oyapassword@postgres:5432/oyadb?schema=public"
```

### 3. Install Monorepo Dependencies
Use npm to install the base dependencies across all workspaces. This uses Turborepo to map the internal `packages/*` folders to the `services/*` correctly.
```bash
npm install
```

### 4. Database Setup (Prisma)
Before booting the system, Prisma needs to generate the strongly-typed database clients based on our `schema.prisma` file.
```bash
npx turbo run generate
```

*(Note: The actual database migration runs automatically when you boot the Docker containers, or you can push it manually using `npx prisma db push`).*

You are now ready to start the system. Proceed to the [Start & Run Guide](START_AND_RUN.md).
