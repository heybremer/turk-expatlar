# Türk Expatlar

Almanya'daki Türkçe konuşanlar için şehir bazlı topluluk, etkinlik, soru-cevap ve işletme rehberi platformu.

## Yapı

- `api/` — NestJS + PostgreSQL + Prisma REST API
- `web/` — Next.js web uygulaması (SEO, forum, işletme dizini)

## Hızlı başlangıç

### 1. Veritabanı

```bash
docker compose up -d
```

### 2. API

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API: http://localhost:3201  
Swagger: http://localhost:3201/api/docs

### 3. Web

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Web: http://localhost:3200

## MVP modülleri

- Kullanıcı kayıt / giriş / profil
- 16 eyalet + şehirler
- Forum (soru-cevap, çözüldü statüsü)
- Etkinlik oluşturma ve katılım
- İşletme dizini ve yorumlar
- Şikayet sistemi
- Admin moderasyon paneli

## Teknoloji

- **Backend:** NestJS, Prisma, PostgreSQL, Redis
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Tasarım:** Deep teal (#0F766E), Inter font
