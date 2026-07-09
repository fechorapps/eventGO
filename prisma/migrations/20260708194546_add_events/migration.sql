/*
  Warnings:

  - Added the required column `event_id` to the `rsvps` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "event_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "celebrant_name" TEXT NOT NULL,
    "subtitle" TEXT DEFAULT 'Mi Bautizo',
    "quote" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "parents" TEXT,
    "godparents" TEXT,
    "church_name" TEXT,
    "church_time" TEXT,
    "church_address" TEXT,
    "church_maps_url" TEXT,
    "hall_name" TEXT,
    "hall_time" TEXT,
    "hall_address" TEXT,
    "hall_maps_url" TEXT,
    "gift_envelope" BOOLEAN NOT NULL DEFAULT true,
    "gift_bank_name" TEXT,
    "gift_bank_owner" TEXT,
    "gift_bank_account" TEXT,
    "gift_bank_clabe" TEXT,
    "rsvp_phone" TEXT,
    "rsvp_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
