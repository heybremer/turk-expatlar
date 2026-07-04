-- AlterEnum
ALTER TYPE "PointAction" ADD VALUE 'USER_REVIEW_CREATED';

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'USER_REVIEW';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_login_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_reviews" (
    "id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "edit_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_reviews_target_user_id_idx" ON "user_reviews"("target_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_reviews_target_user_id_author_id_key" ON "user_reviews"("target_user_id", "author_id");

-- AddForeignKey
ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
