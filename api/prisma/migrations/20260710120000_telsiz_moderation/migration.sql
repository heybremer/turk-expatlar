-- Telsiz şikayet ve susturma tabloları

CREATE TABLE "telsiz_reports" (
    "id"          TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_id" TEXT NOT NULL,
    "channel_id"  TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telsiz_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telsiz_mutes" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "mute_until"   TIMESTAMP(3) NOT NULL,
    "warn_count"   INTEGER NOT NULL DEFAULT 0,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telsiz_mutes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telsiz_reports_reporter_id_reported_id_key"
    ON "telsiz_reports"("reporter_id", "reported_id");

CREATE INDEX "telsiz_reports_reported_id_idx"
    ON "telsiz_reports"("reported_id");

CREATE UNIQUE INDEX "telsiz_mutes_user_id_key"
    ON "telsiz_mutes"("user_id");

ALTER TABLE "telsiz_reports"
    ADD CONSTRAINT "telsiz_reports_reporter_id_fkey"
    FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telsiz_reports"
    ADD CONSTRAINT "telsiz_reports_reported_id_fkey"
    FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telsiz_mutes"
    ADD CONSTRAINT "telsiz_mutes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
