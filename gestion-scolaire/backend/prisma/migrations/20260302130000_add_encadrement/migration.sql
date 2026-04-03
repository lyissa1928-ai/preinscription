-- CreateTable Encadrement (thèses, mémoires, projets)
CREATE TABLE "Encadrement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "annee_univ" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Encadrement_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Encadrement_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Encadrement_teacher_id_idx" ON "Encadrement"("teacher_id");
CREATE INDEX "Encadrement_person_id_idx" ON "Encadrement"("person_id");
