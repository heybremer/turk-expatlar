#!/usr/bin/env bash
# Canlı sunucuda güncelleme (GitHub Actions + manuel deploy)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/turkexpatlar}"
cd "$APP_DIR"

if [[ ! -f api/.env ]]; then
  echo "HATA: api/.env yok — önce env dosyalarını oluşturun."
  exit 1
fi

echo "==> API..."
cd api
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

echo "==> Web..."
cd web
npm ci --legacy-peer-deps
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build
cd ..

mkdir -p logs api/logs web/logs

echo "==> PM2 restart..."
if pm2 describe turkexpatlar-api >/dev/null 2>&1; then
  pm2 restart turkexpatlar-api turkexpatlar-web
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

echo "==> Kontrol..."
curl -sf -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:3201/api/site-settings/public || echo "API: kontrol edilemedi"
curl -sf -o /dev/null -w "WEB: %{http_code}\n" http://127.0.0.1:3200/ || echo "WEB: kontrol edilemedi"
echo "==> Deploy tamamlandı."
