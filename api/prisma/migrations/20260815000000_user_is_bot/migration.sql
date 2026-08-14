-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_bot" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing forum bot accounts
UPDATE "users" SET "is_bot" = true WHERE "email" LIKE 'bot-%@turkexpatlar.de';
