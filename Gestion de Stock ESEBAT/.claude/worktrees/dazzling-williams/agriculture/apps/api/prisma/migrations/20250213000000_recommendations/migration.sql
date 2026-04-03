-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientific_name" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "default_planting_months" INTEGER[],
    "default_harvest_months" INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_requirements" (
    "id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "region_id" TEXT,
    "season" TEXT NOT NULL DEFAULT 'ANY',
    "ph_min" DOUBLE PRECISION,
    "ph_max" DOUBLE PRECISION,
    "soil_moisture_min" DOUBLE PRECISION,
    "soil_moisture_max" DOUBLE PRECISION,
    "salinity_max" DOUBLE PRECISION,
    "rainfall_min_mm" DOUBLE PRECISION,
    "rainfall_max_mm" DOUBLE PRECISION,
    "temp_min_c" DOUBLE PRECISION,
    "temp_max_c" DOUBLE PRECISION,
    "weight_ph" INTEGER NOT NULL DEFAULT 20,
    "weight_moisture" INTEGER NOT NULL DEFAULT 20,
    "weight_salinity" INTEGER NOT NULL DEFAULT 20,
    "weight_rainfall" INTEGER NOT NULL DEFAULT 20,
    "weight_temp" INTEGER NOT NULL DEFAULT 20,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_soil_profiles" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "ph" DOUBLE PRECISION,
    "soil_moisture" DOUBLE PRECISION,
    "salinity" DOUBLE PRECISION,
    "acidity" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_soil_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "generated_by_user_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "engine_version" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "top_crop_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "constraints" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crops_name_key" ON "crops"("name");

-- CreateIndex
CREATE INDEX "crop_requirements_crop_id_idx" ON "crop_requirements"("crop_id");

-- CreateIndex
CREATE INDEX "crop_requirements_region_id_idx" ON "crop_requirements"("region_id");

-- CreateIndex
CREATE UNIQUE INDEX "crop_requirements_crop_id_region_id_season_version_key" ON "crop_requirements"("crop_id", "region_id", "season", "version");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_soil_profiles_parcel_id_key" ON "parcel_soil_profiles"("parcel_id");

-- CreateIndex
CREATE INDEX "parcel_soil_profiles_parcel_id_idx" ON "parcel_soil_profiles"("parcel_id");

-- CreateIndex
CREATE INDEX "recommendations_parcel_id_idx" ON "recommendations"("parcel_id");

-- CreateIndex
CREATE INDEX "recommendations_generated_by_user_id_idx" ON "recommendations"("generated_by_user_id");

-- CreateIndex
CREATE INDEX "recommendations_generated_at_idx" ON "recommendations"("generated_at");

-- CreateIndex
CREATE INDEX "recommendation_items_recommendation_id_idx" ON "recommendation_items"("recommendation_id");

-- CreateIndex
CREATE INDEX "recommendation_items_crop_id_idx" ON "recommendation_items"("crop_id");

-- AddForeignKey
ALTER TABLE "crop_requirements" ADD CONSTRAINT "crop_requirements_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_requirements" ADD CONSTRAINT "crop_requirements_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_soil_profiles" ADD CONSTRAINT "parcel_soil_profiles_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
