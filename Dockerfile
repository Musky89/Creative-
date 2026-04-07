# AgenticForce — production-style image (private dev/staging host).
# Build: docker build -t agenticforce .
# Run: see docker-compose.yml (profile dev-server)

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV AGENTICFORCE_SKIP_ENV_VALIDATION=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Next standalone output omits the Prisma CLI; install it here so `migrate deploy` works at start.
RUN npm install prisma@7.6.0 --omit=dev --no-audit --no-fund

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Root user: named volume for STORAGE_ROOT is writable on first use.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
