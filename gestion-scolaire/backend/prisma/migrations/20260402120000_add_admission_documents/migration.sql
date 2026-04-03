-- Additive only : pièces d'admission par cycle (préinscription) + option sur Formation.
-- Compatible SQLite / aligné sur le schéma Prisma au moment de la migration.

ALTER TABLE "Formation" ADD COLUMN "admission_cycle_code" TEXT;

CREATE TABLE "AdmissionDocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "attestation_accepted_instead_of_diploma" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AdmissionDocumentType_code_key" ON "AdmissionDocumentType"("code");

CREATE TABLE "AdmissionCycleDocumentRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycle_code" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "requirement" TEXT NOT NULL DEFAULT 'REQUIRED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "AdmissionCycleDocumentRule_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "AdmissionDocumentType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AdmissionCycleDocumentRule_cycle_code_document_type_id_key" ON "AdmissionCycleDocumentRule"("cycle_code", "document_type_id");
CREATE INDEX "AdmissionCycleDocumentRule_cycle_code_idx" ON "AdmissionCycleDocumentRule"("cycle_code");
