-- AlterTable
ALTER TABLE "events" ADD COLUMN     "details_background_url" TEXT,
ADD COLUMN     "hero_background_url" TEXT,
ADD COLUMN     "rsvp_background_url" TEXT;

-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "verification_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_slug_key" ON "rsvps"("slug");
