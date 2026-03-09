#!/bin/bash
set -euo pipefail

RAW="https://raw.githubusercontent.com/Eveline-Lim/transcendence/refs/heads/dev"

# ── Prerequisites ─────────────────────────────────────────────────────────────
echo "Checking prerequisites..."
command -v docker  &>/dev/null || { echo "[ERR] docker not found: https://docs.docker.com/get-docker/";  exit 1; }
command -v openssl &>/dev/null || { echo "[ERR] openssl not found."; exit 1; }
docker compose version &>/dev/null 2>&1 || { echo "[ERR] docker compose not found: https://docs.docker.com/compose/install/"; exit 1; }
echo "All prerequisites met."

# ── Secrets ───────────────────────────────────────────────────────────────────
bash <(curl -fsSL "$RAW/scripts/setup-secrets.sh")

# ── Fetch compose files locally (needed for relative secret paths) ────────────
curl -fsSL "$RAW/docker-compose.yml"      -o docker-compose.yml
curl -fsSL "$RAW/docker-compose.ghcr.yml" -o docker-compose.ghcr.yml

# ── Pull and start ────────────────────────────────────────────────────────────
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghcr.yml \
  pull

docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghcr.yml \
  up -d