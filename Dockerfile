# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client is generated via the postinstall/build; ensure it's present.
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server + static assets + prisma engine
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Admin-uploaded product images (see src/lib/uploads.ts) — mount a volume here
# so uploads survive container rebuilds: docker run -v toby-uploads:/app/uploads ...
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
VOLUME /app/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
