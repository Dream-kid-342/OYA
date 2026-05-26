FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/

RUN npm ci --workspace=services/auth-service

COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service
COPY tsconfig.json ./

RUN npm run build -w packages/database
RUN npm run build -w packages/shared
RUN npm run build -w services/auth-service

# ─── Production stage ────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3001

CMD ["node", "dist/app.js"]
