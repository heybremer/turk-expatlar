# AGENTS.md

## Cursor Cloud specific instructions

This is a monorepo for **Türk Expatlar**. The two services relevant for local development are `api/` (NestJS + Prisma) and `web/` (Next.js). `mobile/` is an Expo/React Native app that needs a device/emulator and is not runnable headlessly here. Standard commands live in `README.md`, `api/README.md`, and the `scripts` blocks of each `package.json`.

### Services & how to run them

| Service | Dir | Dev command | URL |
|---------|-----|-------------|-----|
| API (NestJS + Socket.IO) | `api/` | `npm run start:dev` | http://localhost:3201 (Swagger at `/api/docs`, routes prefixed `/api`) |
| Web (Next.js) | `web/` | `npm run dev` | http://localhost:3200 |

PostgreSQL 16 (port 5432) and Redis 7 (port 6379) run as local system services in the VM (installed via apt, not Docker; `docker-compose.yml` is only a reference). Start them if not already running: `sudo pg_ctlcluster 16 main start` and `sudo service redis-server start`.

### Non-obvious gotchas

- **`.env` files are required and gitignored.** `api/.env` (copied from `api/.env.example`) and `web/.env.local` are created during setup and persist in the VM snapshot. `web/.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:3201` and a `JWT_SECRET` that must match `api/.env` (the web middleware verifies JWTs).
- **Google OAuth placeholders are mandatory for the API to boot.** `GoogleStrategy` is always instantiated and its constructor throws `OAuth2Strategy requires a clientID option` if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are empty. `api/.env` sets non-empty placeholder values so the app starts; real Google login stays disabled but email/password auth works.
- **Database schema is applied with `npx prisma db push`, not migrations.** The migration history has a gap (`20260627000000_app_feature_flags` alters `site_settings` before any migration creates it), so `prisma migrate deploy/dev` fails. Use `npx prisma db push` (from `api/`) to sync the schema, then `npx prisma db seed`. The DB with seed data persists in the snapshot, so this is a one-time setup, not part of the startup update script.
- **Seed accounts:** `admin@turkexpatlar.de` / `demo1234` (ADMIN) and `demo@turkexpatlar.de` / `demo1234` (USER).
- **Redis is optional** — the API degrades gracefully (cache disabled) if Redis is down, but logs noisy `[Redis] Error` reconnect lines. If you start the API before Redis, restart the API afterward for a clean connection.
- **Lint is currently failing** in both `api` and `web` due to pre-existing errors (unrelated to setup). `npx tsc --noEmit` and `npm run build` both pass. Note `api`'s `npm run lint` runs `eslint --fix`, which will rewrite source files — avoid committing those churn edits.
- **Web install needs `--legacy-peer-deps`** (peer-dep conflicts); the API installs with a plain `npm ci`.
