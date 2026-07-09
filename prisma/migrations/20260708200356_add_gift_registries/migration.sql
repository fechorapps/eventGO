-- CreateTable
CREATE TABLE "gift_registries" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "store_name" TEXT NOT NULL,
    "registry_number" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_registries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gift_registries" ADD CONSTRAINT "gift_registries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
