-- AlterTable Cohort: add section and effectif_max (columns missing in DB, causes "column does not exist" error)
-- Run once; required for createCohort / liste des classes to work.

-- Add section column (schema has section String @default(""))
ALTER TABLE "Cohort" ADD COLUMN "section" TEXT NOT NULL DEFAULT '';

-- Add effectif_max column (schema has effectifMax Int? @map("effectif_max"))
ALTER TABLE "Cohort" ADD COLUMN "effectif_max" INTEGER;
