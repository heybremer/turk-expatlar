# Hetzner CX33 — turkexpatlar.de

## Domain

- Site: **https://turkexpatlar.de**
- API: **https://api.turkexpatlar.de**

---

## Hetzner DNS (ekrandaki adım)

1. **Add DNS zone** → domain: `turkexpatlar.de`
2. **Create an empty zone** → **Add DNS zone**
3. Zone oluşunca **Records** ekle:

| Type | Name | Value | TTL |
|------|------|--------|-----|
| A | `@` | Hetzner sunucu IPv4 | 3600 |
| A | `www` | aynı IPv4 | 3600 |
| A | `api` | aynı IPv4 | 3600 |

4. Hetzner’in verdiği **nameserver** adreslerini kopyala (ör. `hydrogen.ns.hetzner.com` …)

## IONOS (domain kayıt)

1. IONOS → Alan adları → `turkexpatlar.de` → **Nameserver**
2. IONOS nameserver’ları kaldır, **Hetzner nameserver**’ları yapıştır
3. Kaydet (yayılma 1–24 saat, genelde birkaç saat)

> DNS’i Hetzner’de yönetirsen IONOS’ta sadece nameserver değişir; A kayıtları Hetzner panelinde kalır.

**Alternatif:** Nameserver değiştirmek istemezsen IONOS DNS’te A kayıtları (`@`, `www`, `api`) → Hetzner IPv4.

---

## Sunucu kurulum (özet)

```bash
ssh root@SUNUCU_IP
mkdir -p /opt/turkexpatlar
# Windows'tan: scp turkexpatlar.tar.gz root@IP:/opt/turkexpatlar/
cd /opt/turkexpatlar && tar xzf turkexpatlar.tar.gz
bash scripts/hetzner-setup.sh
# api/.env ve web/.env.local oluştur (scripts/hetzner-*.env.example)
bash scripts/hetzner-deploy.sh
DOMAIN=turkexpatlar.de bash scripts/hetzner-nginx.sh
```

---

## api/.env önemli satırlar

```env
CORS_ORIGIN="https://turkexpatlar.de"
WEB_URL="https://turkexpatlar.de"
SITE_URL="https://turkexpatlar.de"
```

## web/.env.local

```env
NEXT_PUBLIC_API_URL=https://api.turkexpatlar.de
```

---

## Veritabanı yedekleme

Supabase yönettiği için otomatik snapshot alıyor olabilir, ama plana göre
saklama süresi kısa olabileceğinden ek olarak sunucudan günlük `pg_dump`
yedeği almak için `scripts/backup-db.sh` eklendi.

```bash
ssh root@SUNUCU_IP
cd /opt/turkexpatlar
bash scripts/backup-db.sh        # ilk denemeyi elle çalıştır

crontab -e
# Her gün 03:30'da yedek al, 14 gün sakla:
30 3 * * * cd /opt/turkexpatlar && bash scripts/backup-db.sh >> /var/log/turkexpatlar-backup.log 2>&1
```

Yedekler `/opt/turkexpatlar/backups/turkexpatlar_YYYYMMDD_HHMMSS.sql.gz`
olarak tutulur. Sunucunun kendisi de kaybolursa yedekler işe yaramaz —
mümkünse `BACKUP_REMOTE_CMD` ortam değişkeniyle (rclone/s3cmd/restic vb.)
yedekleri sunucu dışına da kopyalayın (script içindeki yorum satırına bakın).
