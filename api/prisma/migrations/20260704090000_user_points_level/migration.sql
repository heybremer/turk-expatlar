-- CreateEnum
CREATE TYPE "PointAction" AS ENUM ('FORUM_TOPIC_CREATED', 'FORUM_REPLY_CREATED', 'FORUM_REPLY_MARKED_BEST', 'EVENT_CREATED', 'EVENT_JOINED', 'EVENT_COMPLETED_ORGANIZER', 'EVENT_COMPLETED_ATTENDEE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "point_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "PointAction" NOT NULL,
    "points" INTEGER NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_logs_user_id_idx" ON "point_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_logs_user_id_action_ref_id_key" ON "point_logs"("user_id", "action", "ref_id");

-- AddForeignKey
ALTER TABLE "point_logs" ADD CONSTRAINT "point_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
