-- Redmine: structure pédagogique automatisée (Licence/Master)
ALTER TABLE "Formation" ADD COLUMN "structure_managed" BOOLEAN NOT NULL DEFAULT 0;
