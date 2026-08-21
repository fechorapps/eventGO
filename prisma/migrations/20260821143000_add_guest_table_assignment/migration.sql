-- Assignments are stored per guest so members of one RSVP can sit at different tables.
ALTER TABLE "guests" ADD COLUMN "table_id" INTEGER;

-- Preserve every existing family assignment during the transition.
UPDATE "guests" AS "guest"
SET "table_id" = "rsvp"."table_id"
FROM "rsvps" AS "rsvp"
WHERE "guest"."rsvp_id" = "rsvp"."id";

CREATE INDEX "guests_table_id_idx" ON "guests"("table_id");

ALTER TABLE "guests"
ADD CONSTRAINT "guests_table_id_fkey"
FOREIGN KEY ("table_id") REFERENCES "tables"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
