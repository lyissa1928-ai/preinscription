-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Cohort_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "maquette_id" TEXT NOT NULL,
    "semestre_id" TEXT NOT NULL,
    "cohort_id" TEXT,
    "annee_univ" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PROVISOIRE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Inscription_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inscription_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inscription_maquette_id_fkey" FOREIGN KEY ("maquette_id") REFERENCES "Maquette" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inscription_semestre_id_fkey" FOREIGN KEY ("semestre_id") REFERENCES "Semestre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inscription_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "Cohort" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_formation_id_annee_nom_key" ON "Cohort"("formation_id", "annee", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_person_id_annee_univ_key" ON "Inscription"("person_id", "annee_univ");
