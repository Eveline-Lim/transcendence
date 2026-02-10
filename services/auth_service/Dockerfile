FROM node:20-alpine

WORKDIR /app

RUN apk --no-cache add curl

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]