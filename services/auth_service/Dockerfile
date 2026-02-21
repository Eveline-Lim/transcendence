FROM node:20-alpine

WORKDIR /app

RUN apk --no-cache add curl

COPY package*.json ./

RUN npm install


RUN addgroup -g 1001 -S nodejs \
&& adduser -S nodejs -u 1001

COPY --chown=node:node server.js ./
COPY --chown=node:node package*.json ./

USER nodejs

EXPOSE 3001

CMD ["node", "server.js"]