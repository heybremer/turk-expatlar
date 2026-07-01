-- Uygulamalar sayfası modül anahtarları
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_state_news_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_city_news_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_event_calendar_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_public_holidays_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_consulates_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_official_institutions_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "app_travel_guide_enabled" BOOLEAN NOT NULL DEFAULT true;
