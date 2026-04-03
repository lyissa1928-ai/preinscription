-- CreateTable
CREATE TABLE "SessionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "annee_univ" INTEGER NOT NULL,
    "session" INTEGER NOT NULL,
    "date_limite" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "ec_id" TEXT NOT NULL,
    "session" INTEGER NOT NULL,
    "annee_univ" INTEGER NOT NULL,
    "note" REAL NOT NULL,
    "saisie_par_id" TEXT,
    "date_saisie" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Grade_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_ec_id_fkey" FOREIGN KEY ("ec_id") REFERENCES "EC" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_saisie_par_id_fkey" FOREIGN KEY ("saisie_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeModificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grade_id" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "demandeur_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "valide_par_id" TEXT,
    "date_validation" DATETIME,
    "nouvelle_note" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "GradeModificationRequest_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "Grade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradeModificationRequest_demandeur_id_fkey" FOREIGN KEY ("demandeur_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradeModificationRequest_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionConfig_annee_univ_session_key" ON "SessionConfig"("annee_univ", "session");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_person_id_ec_id_session_annee_univ_key" ON "Grade"("person_id", "ec_id", "session", "annee_univ");
