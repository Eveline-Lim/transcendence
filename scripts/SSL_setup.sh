if [[ ! -f "secrets/ssl_key" ]]; then
    echo "  + Génération certificat SSL auto-signé..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout secrets/ssl_key \
        -out secrets/ssl_cert \
        -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Transcendence/CN=localhost" 2>/dev/null
fi