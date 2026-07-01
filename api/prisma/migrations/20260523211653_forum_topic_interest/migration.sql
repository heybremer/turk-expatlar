-- CreateTable
CREATE TABLE "forum_topic_interests" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_topic_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_topic_interests_topic_id_idx" ON "forum_topic_interests"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_topic_interests_topic_id_user_id_key" ON "forum_topic_interests"("topic_id", "user_id");

-- AddForeignKey
ALTER TABLE "forum_topic_interests" ADD CONSTRAINT "forum_topic_interests_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_interests" ADD CONSTRAINT "forum_topic_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
