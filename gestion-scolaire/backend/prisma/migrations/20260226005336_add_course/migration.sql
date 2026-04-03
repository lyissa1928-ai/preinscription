-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ec_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "salle_id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "heure_debut" INTEGER NOT NULL,
    "heure_fin" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "groupe" TEXT,
    "annee_univ" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Course_ec_id_fkey" FOREIGN KEY ("ec_id") REFERENCES "EC" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Course_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Course_salle_id_fkey" FOREIGN KEY ("salle_id") REFERENCES "Salle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
