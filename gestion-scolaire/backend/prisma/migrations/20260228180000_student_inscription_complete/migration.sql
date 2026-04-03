-- AlterTable Student: état civil, parcours, urgence, justificatifs, statut
ALTER TABLE "Student" ADD COLUMN "photo_profil" TEXT;
ALTER TABLE "Student" ADD COLUMN "nationalite" TEXT;
ALTER TABLE "Student" ADD COLUMN "genre" TEXT;
ALTER TABLE "Student" ADD COLUMN "dernier_diplome" TEXT;
ALTER TABLE "Student" ADD COLUMN "annee_obtention" INTEGER;
ALTER TABLE "Student" ADD COLUMN "mention" TEXT;
ALTER TABLE "Student" ADD COLUMN "etablissement_origine" TEXT;
ALTER TABLE "Student" ADD COLUMN "nom_tuteur" TEXT;
ALTER TABLE "Student" ADD COLUMN "lien_parente" TEXT;
ALTER TABLE "Student" ADD COLUMN "justificatif_bac" TEXT;
ALTER TABLE "Student" ADD COLUMN "justificatif_cni" TEXT;
ALTER TABLE "Student" ADD COLUMN "statut_inscription" TEXT NOT NULL DEFAULT 'en_attente';
