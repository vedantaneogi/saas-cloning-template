FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY apps/web/package.json apps/web/package-lock.json* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY apps/web .

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm build

FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "start"]
