#!/usr/bin/env bash
# Production veritabanı yedeği — Hetzner VPS üzerinde cron ile çalıştırılmak üzere tasarlandı.
#
# Kullanım (VPS'te, api/.env zaten mevcutken):
#   bash scripts/backup-db.sh
#
# Cron kurulumu (her gün 03:30'da yedek al):
#   crontab -e
#   30 3 * * * cd /opt/turkexpatlar && bash scripts/backup-db.sh >> /var/log/turkexpatlar-backup.log 2>&1
#
# Ortam değişkenleri:
#   DATABASE_URL   — zorunlu değilse api/.env dosyasından okunur
#   BACKUP_DIR      — yedeklerin tutulacağı klasör (varsayılan: /opt/turkexpatlar/backups)
#   BACKUP_RETENTION_DAYS — kaç günlük yedek tutulacak (varsayılan: 14)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/turkexpatlar}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$APP_DIR/api/.env" ]]; then
    # shellcheck disable=SC1090
    DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$APP_DIR/api/.env" | cut -d'=' -f2- | tr -d '"' )"
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "HATA: DATABASE_URL bulunamadı (ortam değişkeni veya api/.env)." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "HATA: pg_dump bulunamadı. 'apt-get install -y postgresql-client' ile kurun." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/turkexpatlar_${TIMESTAMP}.sql.gz"

echo "==> Yedek alınıyor: $OUT_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "==> Tamamlandı ($SIZE)"

echo "==> ${RETENTION_DAYS} günden eski yedekler siliniyor..."
find "$BACKUP_DIR" -name 'turkexpatlar_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "==> Mevcut yedekler:"
ls -lh "$BACKUP_DIR" | grep turkexpatlar_ || echo "  (henüz başka yedek yok)"

# İsteğe bağlı: uzak depolama senkronizasyonu (örn. rclone, s3cmd, restic).
# Aktif etmek için BACKUP_REMOTE_CMD ortam değişkenine tam bir kopyalama komutu
# tanımlayın, örn:
#   BACKUP_REMOTE_CMD="rclone copy $OUT_FILE remote:turkexpatlar-backups/"
if [[ -n "${BACKUP_REMOTE_CMD:-}" ]]; then
  echo "==> Uzak depolamaya kopyalanıyor..."
  eval "$BACKUP_REMOTE_CMD"
fi
