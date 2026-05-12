# syntax=docker/dockerfile:1.9
# Build context = repo root. Use npm (flat node_modules) so Next.js
# standalone tracer can find `next` and friends without symlink resolution.

############################
# Stage 1 — deps + build
############################
FROM node:22-alpine AS builder

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install --no-audit --no-fund --include=dev

COPY apps/web ./

# next.config.ts evaluates rewrites() at build time (standalone bundle bakes
# the routing manifest). API_URL needs to be present during `next build` so
# the /api/* proxy points to the docker network host, not the build sandbox.
ARG API_URL=http://api:8000
ENV API_URL=${API_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

############################
# Stage 2 — runtime
############################
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# next.config.ts sets output: "standalone" — copy the minimal server bundle.
COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static

EXPOSE 3000

CMD ["node", "server.js"]
