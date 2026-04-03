-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "duree_semestres" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Maquette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "annee_ref" INTEGER NOT NULL,
    "formation_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Maquette_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Semestre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "maquette_id" TEXT NOT NULL,
    "credits_ects" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Semestre_maquette_id_fkey" FOREIGN KEY ("maquette_id") REFERENCES "Maquette" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UE" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "semestre_id" TEXT NOT NULL,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "credits_ects" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "UE_semestre_id_fkey" FOREIGN KEY ("semestre_id") REFERENCES "Semestre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ue_id" TEXT NOT NULL,
    "vh_cm" INTEGER NOT NULL DEFAULT 0,
    "vh_td" INTEGER NOT NULL DEFAULT 0,
    "vh_tp" INTEGER NOT NULL DEFAULT 0,
    "vh_tpe" INTEGER NOT NULL DEFAULT 0,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "credits_ects" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "EC_ue_id_fkey" FOREIGN KEY ("ue_id") REFERENCES "UE" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Salle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL DEFAULT 30,
    "equipements" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TariffRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formation_id" TEXT,
    "taux_cm" REAL NOT NULL DEFAULT 0,
    "taux_td" REAL NOT NULL DEFAULT 0,
    "taux_tp" REAL NOT NULL DEFAULT 0,
    "taux_tpe" REAL NOT NULL DEFAULT 0,
    "date_effet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Formation_code_key" ON "Formation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Maquette_formation_id_annee_ref_key" ON "Maquette"("formation_id", "annee_ref");

-- CreateIndex
CREATE UNIQUE INDEX "Semestre_maquette_id_numero_key" ON "Semestre"("maquette_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "UE_semestre_id_code_key" ON "UE"("semestre_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EC_ue_id_code_key" ON "EC"("ue_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Salle_nom_key" ON "Salle"("nom");
