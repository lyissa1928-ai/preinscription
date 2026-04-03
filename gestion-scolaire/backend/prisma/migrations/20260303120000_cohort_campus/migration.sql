-- Cohort appartient à un campus
ALTER TABLE "Cohort" ADD COLUMN "campus_id" TEXT;
CREATE INDEX "Cohort_campus_id_idx" ON "Cohort"("campus_id");
