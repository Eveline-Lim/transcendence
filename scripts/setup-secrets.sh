#!/bin/bash
# scripts/setup-secrets.sh

mkdir -p secrets

echo "Génération des secrets..."

# Fonction helper
create_secret() {
    if [[ ! -f "secrets/$1" ]]; then
        echo "$2" > "secrets/$1"
        echo "  + secrets/$1 créé"
    else
        echo "  . secrets/$1 existe déjà"
    fi
    return 0
}

# Database
create_secret "db_host" "postgres"
create_secret "db_port" "5432"
create_secret "db_name" "transcendence"
create_secret "db_user" "admin"
create_secret "db_password" "StrongPassword123!"

# Redis
create_secret "redis_host" "redis"
create_secret "redis_password" "RedisSecretPass42!"

# Auth Service
create_secret "auth_service_port" "3001"
create_secret "jwt_secret" "SuperSecretJWTKey_ChangeMeInProd"
create_secret "jwt_expiration" "1d"
create_secret "node_env" "development"
create_secret "log_level" "debug"
create_secret "oauth_42_client_id" "u-s42-xxxx"
create_secret "oauth_42_client_secret" "s-s42-xxxx"
create_secret "oauth_42_client_callback_url" "http://localhost:8080/api/v1/auth/callback/42"
create_secret "smtp_user" "evelinelim03@gmail.com"
create_secret "smtp_password" "yqmy nncu smvh srmu"

# Nginx
create_secret "nginx_port" "80"
create_secret "frontend_url" "http://localhost:8080"

# SSL (Self-signed pour le dev)
if [[ ! -f "secrets/ssl_key" ]]; then
    echo "  + Génération certificat SSL auto-signé..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout secrets/ssl_key \
        -out secrets/ssl_cert \
        -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Transcendence/CN=localhost" 2>/dev/null
fi

echo "Secrets prêts!"
