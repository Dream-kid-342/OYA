FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig.json ./

# Copy all workspaces
COPY packages/ ./packages/
COPY services/ ./services/

# Install all dependencies
RUN npm ci

# Generate Prisma Client
RUN npm run db:generate

# Build dependencies first
RUN npm run build -w @oya/shared
RUN npm run build -w @oya/database

# Build the specific service
RUN npm run build -w @oya/queue-worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built node_modules and necessary workspaces
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/queue-worker ./services/queue-worker

# Start the service
CMD ["npm", "start", "-w", "@oya/queue-worker"]
