FROM node:20-alpine

WORKDIR /app

RUN apk --no-cache add curl

COPY package*.json ./

RUN npm install

COPY . .

RUN addgroup -g 1001 -S nodejs \
	&& adduser -S nodejs -u 1001 \
	&& chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]