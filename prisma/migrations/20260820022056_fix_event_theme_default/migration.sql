-- AlterTable
ALTER TABLE "events" ALTER COLUMN "theme" SET DEFAULT 'bautizo-olivos-serenos';

-- Backfill: the previous migration's default ("dorado-clasico") never
-- matched an id in the real catalog (src/lib/themes.ts) — it happened to
-- fall back safely via getTheme()'s own null-coalescing, but every row
-- should carry a real theme id going forward.
UPDATE "events" SET "theme" = 'bautizo-olivos-serenos' WHERE "theme" = 'dorado-clasico';
