# IONOS Webspace — Deploy Durumu ve Sonraki Adımlar

## Yapılanlar

- Sunucu erişimi test edildi (IONOS Webspace SSH erişimi, port 22)
- Node.js **v18.20.4**, npm, git mevcut
- PM2 `npx pm2` ile kullanılabilir (v7)
- Proje `~/turkexpatlar` dizinine yüklendi
- `sifre.md` `.gitignore`'a eklendi (şifre repoya gitmez)

## Engelleyen noktalar

| Gereksinim | Sunucu durumu |
|------------|----------------|
| Node.js ≥ 20.9 (Next.js 16) | Sunucuda **18.20.4** |
| PostgreSQL | **Yok** (yalnızca MySQL client) |
| Redis | **Yok** |

Bu nedenle tam stack (Next.js + NestJS + Prisma + Redis) bu Webspace paketinde **doğrudan çalışmaz**.

## Seçenekler

### A) IONOS’ta Node 20 etkinleştir (önerilen ilk adım)

IONOS panelinde **Node.js sürümünü 20+** yapın (varsa). Sonra sunucuda:

```bash
cd ~/turkexpatlar
# api/.env ve web/.env.local oluşturun (aşağıdaki şablon)
cd api && npx prisma migrate deploy && npm run build
cd ../web && npm run build
cd .. && npx pm2 start ecosystem.config.js --env production
npx pm2 save
```

### B) Harici veritabanı + Redis (ücretsiz katmanlar)

- **PostgreSQL:** [Supabase](https://supabase.com) veya IONOS Managed PostgreSQL
- **Redis:** [Upstash](https://upstash.com)

`api/.env` örneği:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="rediss://..."
JWT_SECRET="uzun-rastgele-string"
CORS_ORIGIN="https://sizin-domain.com"
WEB_URL="https://sizin-domain.com"
SITE_URL="https://sizin-domain.com"
PORT=3201
```

`web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.sizin-domain.com
JWT_SECRET="api ile aynı"
```

### C) VPS’e geçiş

Mevcut `ecosystem.config.js` ve `.github/workflows/deploy.yml` tam VPS (Hetzner, Contabo vb.) için hazır.

## Yerel deploy scriptleri

```powershell
# Sunucu kontrolü
$env:SSH_HOST="..." ; $env:SSH_USER="..." ; $env:SSH_PASS="..." ; node scripts/server-probe.js

# Kaynak kodu yükle
$env:SSH_HOST="..." ; $env:SSH_USER="..." ; $env:SSH_PASS="..." ; node scripts/deploy-to-webspace.js
```

## SSH bağlantısı

```bash
ssh KULLANICI@SUNUCU_HOST
```

IONOS panelinde görünen `erişim-...` adresi, SSH host adının Türkçe/ASCII çözümlemesidir (panelde tam adresi görebilirsiniz).
