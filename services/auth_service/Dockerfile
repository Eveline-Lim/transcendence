FROM node:20-alpine AS deps

WORKDIR /app

RUN apk --no-cache add python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# ---

FROM node:20-alpine

WORKDIR /app

RUN apk --no-cache add curl \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

COPY --from=deps /app/node_modules ./node_modules

COPY --chown=nodejs:nodejs controllers controllers
COPY --chown=nodejs:nodejs middleware  middleware
COPY --chown=nodejs:nodejs models     models
COPY --chown=nodejs:nodejs routes     routes
COPY --chown=nodejs:nodejs utils      utils
COPY --chown=nodejs:nodejs mailService.js redisClient.js server.js package.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
