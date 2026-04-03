-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "heures_cm" REAL NOT NULL DEFAULT 0,
    "heures_td" REAL NOT NULL DEFAULT 0,
    "heures_tp" REAL NOT NULL DEFAULT 0,
    "heures_tpe" REAL NOT NULL DEFAULT 0,
    "montant" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Payroll_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaySlip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payroll_id" TEXT NOT NULL,
    "fichier_path" TEXT NOT NULL,
    "date_generation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaySlip_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "Payroll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_person_id_mois_annee_key" ON "Payroll"("person_id", "mois", "annee");

-- CreateIndex
CREATE UNIQUE INDEX "PaySlip_payroll_id_key" ON "PaySlip"("payroll_id");
