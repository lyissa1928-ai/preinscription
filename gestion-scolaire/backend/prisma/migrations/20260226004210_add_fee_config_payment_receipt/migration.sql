-- CreateTable
CREATE TABLE "FeeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formation_id" TEXT NOT NULL,
    "frais_inscription" REAL NOT NULL DEFAULT 0,
    "mensualite" REAL NOT NULL DEFAULT 0,
    "nb_mois" INTEGER NOT NULL DEFAULT 10,
    "frais_soutenance_l3" REAL NOT NULL DEFAULT 0,
    "frais_soutenance_m2" REAL NOT NULL DEFAULT 0,
    "annee_univ" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FeeConfig_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "inscription_id" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "mois" INTEGER,
    "annee" INTEGER,
    "date_paiement" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "valide_par_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Payment_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_inscription_id_fkey" FOREIGN KEY ("inscription_id") REFERENCES "Inscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payment_id" TEXT NOT NULL,
    "fichier_path" TEXT NOT NULL,
    "date_generation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReceipt_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeConfig_formation_id_annee_univ_key" ON "FeeConfig"("formation_id", "annee_univ");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_payment_id_key" ON "PaymentReceipt"("payment_id");
