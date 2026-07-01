#!/usr/bin/env bash
# Kullanım: DOMAIN=turkexpatlar.de bash scripts/hetzner-nginx.sh
set -euo pipefail

DOMAIN="${DOMAIN:-turkexpatlar.de}"
API_DOMAIN="${API_DOMAIN:-api.${DOMAIN}}"

cat > "/etc/nginx/sites-available/turkexpatlar" << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name ${API_DOMAIN};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/turkexpatlar /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> SSL (Let's Encrypt)..."
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" -d "${API_DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" || \
  echo "SSL başarısız — e-posta/domain DNS kontrol edin, sonra: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${API_DOMAIN}"

echo "✓ Nginx yapılandırıldı: https://${DOMAIN} ve https://${API_DOMAIN}"
