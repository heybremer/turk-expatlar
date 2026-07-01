#!/usr/bin/env bash
# Sunucuda ilk kurulum veya güncelleme (GitHub Actions deploy.yml ile aynı mantık)
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/turkexpatlar}"
cd "$APP_DIR"

echo "==> Pull..."
git pull origin main

echo "==> API build..."
cd api
npm ci
npx prisma migrate deploy
npm run build
cd ..

echo "==> Web build..."
cd web
npm ci --legacy-peer-deps
npm run build
cd ..

echo "==> PM2 restart..."
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save

echo "==> Deploy tamamlandı."
