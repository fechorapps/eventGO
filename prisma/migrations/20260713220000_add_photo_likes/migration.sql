-- CreateTable
CREATE TABLE "photo_likes" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_likes_event_id_photo_url_idx" ON "photo_likes"("event_id", "photo_url");

-- CreateIndex
CREATE UNIQUE INDEX "photo_likes_event_id_photo_url_client_id_key" ON "photo_likes"("event_id", "photo_url", "client_id");

-- AddForeignKey
ALTER TABLE "photo_likes" ADD CONSTRAINT "photo_likes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
