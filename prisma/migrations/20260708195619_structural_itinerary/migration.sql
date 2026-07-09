/*
  Warnings:

  - You are about to drop the column `itinerary` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "itinerary";

-- CreateTable
CREATE TABLE "itinerary_items" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
