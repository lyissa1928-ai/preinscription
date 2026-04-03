-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "course_id" TEXT,
    "date" DATETIME NOT NULL,
    "heure_arrivee" DATETIME NOT NULL,
    "heure_depart" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "valide_par_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Attendance_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attendance_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
