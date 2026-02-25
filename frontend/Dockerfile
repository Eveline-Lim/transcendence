# ================================
# STAGE 1 : Build
# ================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code source
COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Build de production
RUN npm run build

# ================================
# STAGE 2 : Serve avec Nginx
# ================================
FROM nginx:alpine

# Copier les fichiers buildés vers nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
