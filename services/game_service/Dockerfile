FROM node:20-alpine AS build

WORKDIR /app

COPY game-service/package*.json ./
RUN npm ci

COPY game-service/src ./src
COPY game-service/tsconfig.json ./

RUN npm install typescript
RUN npx tsc

FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

USER appuser

EXPOSE 3001

CMD ["node", "dist/server.js"]
