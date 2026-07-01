#!/usr/bin/env bash
# Sunucuda bir kez çalıştırın (VPS / Node destekli sunucu)
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/turkexpatlar}"
REPO_URL="${REPO_URL:-}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL gerekli, örn: https://github.com/kullanici/turk-expatlar.git"
  exit 1
fi

command -v node >/dev/null || { echo "Node.js yok — bu sunucu Webspace paylaşımlı hosting olabilir."; exit 1; }

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
mkdir -p logs

# api/.env ve web/.env.local sunucuda elle oluşturulmalı
if [ ! -f api/.env ]; then
  echo "api/.env oluşturun (api/.env.example şablonuna bakın)"
  cp api/.env.example api/.env
fi

npm install -g pm2 2>/dev/null || true

bash scripts/deploy-remote.sh
