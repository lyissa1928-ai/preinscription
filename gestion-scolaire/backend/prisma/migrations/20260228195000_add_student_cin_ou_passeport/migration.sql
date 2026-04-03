-- AlterTable Student: add cin_ou_passeport (required for inscription, column missing in DB)
ALTER TABLE "Student" ADD COLUMN "cin_ou_passeport" TEXT;
