-- AlterTable
ALTER TABLE "guests"
ADD COLUMN     "meal_type" TEXT NOT NULL DEFAULT 'ADULTO';

-- Los invitados que ya estaban registrados como niños comen platillo de niño.
-- Los adultos conservan el platillo de adulto y ahora pueden cambiarlo a mano.
UPDATE "guests" SET "meal_type" = 'NINO' WHERE "is_child" = true;
