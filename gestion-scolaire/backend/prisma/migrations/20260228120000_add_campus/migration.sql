-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "region" TEXT,
    "departement" TEXT,
    "commune" TEXT,
    "tel_direction" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Campus_code_key" ON "Campus"("code");

-- AlterTable Salle: add code, campus_id, type_salle (SQLite)
ALTER TABLE "Salle" ADD COLUMN "code" TEXT;
ALTER TABLE "Salle" ADD COLUMN "campus_id" TEXT;
ALTER TABLE "Salle" ADD COLUMN "type_salle" TEXT;

-- Drop old unique on nom (one nom per Salle globally)
DROP INDEX "Salle_nom_key";

-- New unique: (campus_id, nom) so same nom can exist on different campuses
CREATE UNIQUE INDEX "Salle_campus_id_nom_key" ON "Salle"("campus_id", "nom");

-- Unique code for Salle (optional field)
CREATE UNIQUE INDEX "salle_code_unique" ON "Salle"("code");
