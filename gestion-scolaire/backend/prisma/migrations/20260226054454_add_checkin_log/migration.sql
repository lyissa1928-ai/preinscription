-- CreateTable
CREATE TABLE "CheckInLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "date_heure" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorise" BOOLEAN NOT NULL,
    "message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
