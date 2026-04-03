-- AlterTable
-- Add profile and badge columns to User (SQLite: one ADD COLUMN per statement)
ALTER TABLE "User" ADD COLUMN "date_of_birth" DATETIME;

ALTER TABLE "User" ADD COLUMN "marital_status" TEXT;

ALTER TABLE "User" ADD COLUMN "number_of_children" INTEGER;

ALTER TABLE "User" ADD COLUMN "matricule" TEXT;

ALTER TABLE "User" ADD COLUMN "phone" TEXT;

ALTER TABLE "User" ADD COLUMN "address" TEXT;

ALTER TABLE "User" ADD COLUMN "profile_photo_url" TEXT;

ALTER TABLE "User" ADD COLUMN "profile_validated" BOOLEAN NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN "badge_barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_matricule_key" ON "User"("matricule");

CREATE UNIQUE INDEX "User_badge_barcode_key" ON "User"("badge_barcode");
