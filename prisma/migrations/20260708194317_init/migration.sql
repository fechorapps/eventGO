-- CreateTable
CREATE TABLE "rsvps" (
    "id" SERIAL NOT NULL,
    "family_name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" SERIAL NOT NULL,
    "rsvp_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_child" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_rsvp_id_fkey" FOREIGN KEY ("rsvp_id") REFERENCES "rsvps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
