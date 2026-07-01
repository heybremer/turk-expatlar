#!/usr/bin/env bash
# Hetzner CX33 — ilk kurulum (root veya sudo ile çalıştırın)
# Kullanım: curl ile indirip çalıştırın veya projeden: bash scripts/hetzner-setup.sh
set -euo pipefail

echo "==> Sistem güncelleniyor..."
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Paketler kuruluyor..."
apt-get install -y -qq git nginx certbot python3-certbot-nginx ufw curl build-essential

echo "==> Node.js 20 kuruluyor..."
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
node -v
npm -v

echo "==> PM2 kuruluyor..."
npm install -g pm2

echo "==> Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Uygulama dizini..."
mkdir -p /opt/turkexpatlar
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" /opt/turkexpatlar 2>/dev/null || true

echo ""
echo "✓ Sunucu hazır."
echo "  Sonraki adım: projeyi /opt/turkexpatlar içine kopyalayın"
echo "  Sonra: cd /opt/turkexpatlar && bash scripts/hetzner-deploy.sh"
