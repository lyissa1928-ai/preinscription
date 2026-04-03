-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "type_contrat" TEXT NOT NULL,
    "taux_horaire" REAL NOT NULL DEFAULT 0,
    "date_debut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Teacher_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_person_id_key" ON "Teacher"("person_id");
