-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sens" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libelle" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLARD',
    "type_paiement" TEXT NOT NULL,
    "reference_externe" TEXT,
    "cloture_journaliere_id" TEXT,
    "enregistre_par_id" TEXT NOT NULL,
    "rapproche" BOOLEAN NOT NULL DEFAULT false,
    "date_rapprochement" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Transaction_enregistre_par_id_fkey" FOREIGN KEY ("enregistre_par_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_cloture_journaliere_id_fkey" FOREIGN KEY ("cloture_journaliere_id") REFERENCES "ClotureJournaliere" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "date_generation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionReceipt_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClotureJournaliere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "cloture_par_id" TEXT NOT NULL,
    "cloture_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClotureJournaliere_cloture_par_id_fkey" FOREIGN KEY ("cloture_par_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompteComptable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_compte" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "solde" REAL NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EcritureComptable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "compte_debit_id" TEXT NOT NULL,
    "compte_credit_id" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "date_ecriture" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libelle" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EcritureComptable_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EcritureComptable_compte_debit_id_fkey" FOREIGN KEY ("compte_debit_id") REFERENCES "CompteComptable" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EcritureComptable_compte_credit_id_fkey" FOREIGN KEY ("compte_credit_id") REFERENCES "CompteComptable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exercice" INTEGER NOT NULL,
    "departement" TEXT NOT NULL,
    "montant_alloue" REAL NOT NULL,
    "montant_consomme" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DemandeDecaissement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "initie_par_id" TEXT NOT NULL,
    "approuve_par_id" TEXT,
    "date_decision" DATETIME,
    "motif_rejet" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "DemandeDecaissement_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandeDecaissement_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandeDecaissement_initie_par_id_fkey" FOREIGN KEY ("initie_par_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandeDecaissement_approuve_par_id_fkey" FOREIGN KEY ("approuve_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionReceipt_transaction_id_key" ON "TransactionReceipt"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClotureJournaliere_date_key" ON "ClotureJournaliere"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CompteComptable_numero_compte_key" ON "CompteComptable"("numero_compte");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_exercice_departement_key" ON "Budget"("exercice", "departement");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeDecaissement_transaction_id_key" ON "DemandeDecaissement"("transaction_id");
