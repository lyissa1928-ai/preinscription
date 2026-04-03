-- CreateTable
CREATE TABLE "DailyFinancialStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "total_encaissements" REAL NOT NULL DEFAULT 0,
    "total_depenses" REAL NOT NULL DEFAULT 0,
    "solde" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'DRAFT',
    "valide_par_id" TEXT,
    "valide_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "DailyFinancialStatus_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BreachRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financial_status_id" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "demandeur_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "approuve_par_id" TEXT,
    "date_approbation" DATETIME,
    "commentaire" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BreachRequest_financial_status_id_fkey" FOREIGN KEY ("financial_status_id") REFERENCES "DailyFinancialStatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BreachRequest_demandeur_id_fkey" FOREIGN KEY ("demandeur_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BreachRequest_approuve_par_id_fkey" FOREIGN KEY ("approuve_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyFinancialStatus_date_key" ON "DailyFinancialStatus"("date");
