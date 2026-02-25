FROM node:20-alpine

WORKDIR /app

RUN apk --no-cache add curl

COPY package*.json ./

RUN npm install

RUN addgroup -g 1001 -S nodejs \
&& adduser -S nodejs -u 1001

COPY --chown=node:node controllers ./controllers
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node routes ./routes
COPY --chown=node:node utils ./utils
COPY --chown=node:node mailService.js ./
COPY --chown=node:node package*.json ./
COPY --chown=node:node redisClient.js ./
COPY --chown=node:node server.js ./

USER nodejs

EXPOSE 3001

CMD ["node", "server.js"]