-- CreateEnum
CREATE TYPE "EditorTeam" AS ENUM ('EVENTS', 'GUIDE', 'JOBS', 'TRAVEL');

-- CreateEnum
CREATE TYPE "EditorialTaskType" AS ENUM (
  'EVENT_REVIEW',
  'EVENT_ATTENDEE_REVIEW',
  'GUIDE_DRAFT',
  'GUIDE_REVIEW',
  'JOB_REVIEW',
  'TRAVEL_REVIEW',
  'COURIER_REVIEW'
);

-- CreateEnum
CREATE TYPE "EditorialTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "editor_team" "EditorTeam";

-- CreateTable
CREATE TABLE "editorial_tasks" (
  "id" TEXT NOT NULL,
  "team" "EditorTeam" NOT NULL,
  "type" "EditorialTaskType" NOT NULL,
  "status" "EditorialTaskStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "assigned_to_id" TEXT,
  "due_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "editorial_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_editor_team_idx" ON "users"("editor_team");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_tasks_type_entity_id_key" ON "editorial_tasks"("type", "entity_id");

-- CreateIndex
CREATE INDEX "editorial_tasks_team_status_idx" ON "editorial_tasks"("team", "status");

-- CreateIndex
CREATE INDEX "editorial_tasks_assigned_to_id_idx" ON "editorial_tasks"("assigned_to_id");

-- AddForeignKey
ALTER TABLE "editorial_tasks"
ADD CONSTRAINT "editorial_tasks_assigned_to_id_fkey"
FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
