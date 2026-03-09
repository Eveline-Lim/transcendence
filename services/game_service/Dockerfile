# ---- Stage 1: Build TypeScript ----
FROM node:20-alpine AS build

WORKDIR /app

COPY game-service/package*.json ./
RUN npm ci

COPY game-service/src ./src
COPY game-service/tsconfig.json ./

RUN npx tsc

# ---- Stage 2: Production dependencies only ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY game-service/package*.json ./
RUN npm ci --omit=dev

# ---- Stage 3: Final minimal image ----
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=deps  /app/node_modules ./node_modules

USER appuser

EXPOSE 3001

CMD ["node", "dist/server.js"]
