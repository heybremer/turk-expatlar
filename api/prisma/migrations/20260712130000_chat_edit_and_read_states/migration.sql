-- Sohbet: mesaj düzenleme ve kanal okundu durumu

ALTER TABLE "messages" ADD COLUMN "edited_at" TIMESTAMP(3);

CREATE TABLE "chat_read_states" (
    "id"           TEXT NOT NULL,
    "chat_id"      TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_read_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_read_states_chat_id_user_id_key" ON "chat_read_states"("chat_id", "user_id");
CREATE INDEX "chat_read_states_user_id_idx" ON "chat_read_states"("user_id");

ALTER TABLE "chat_read_states"
    ADD CONSTRAINT "chat_read_states_chat_id_fkey"
    FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_read_states"
    ADD CONSTRAINT "chat_read_states_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
