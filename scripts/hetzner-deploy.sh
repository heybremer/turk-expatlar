#!/usr/bin/env bash
# Proje /opt/turkexpatlar içinde — .env dosyaları hazır olmalı
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/turkexpatlar}"
cd "$APP_DIR"

if [[ ! -f api/.env ]]; then
  echo "HATA: api/.env yok. Önce env dosyalarını oluşturun."
  exit 1
fi

echo "==> API..."
cd api
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

# NOT: "npx prisma db seed" bilerek burada çalıştırılmıyor.
# Seed script'i her deploy'da otomatik çalıştırmak production verisinde
# istenmeyen değişikliklere yol açabilir. Seed'i sadece gerektiğinde,
# elle (node scripts/hetzner-seed.js veya sunucuda `npx prisma db seed`) çalıştırın.

echo "==> Web..."
cd web
npm ci --legacy-peer-deps
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build
cd ..

mkdir -p logs api/logs web/logs

echo "==> PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | grep -v 'PM2' | bash || true

echo "==> Tamam. PM2 durumu:"
pm2 list
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:3201/api/site-settings/public || true
curl -s -o /dev/null -w "WEB: %{http_code}\n" http://127.0.0.1:3200/ || true
