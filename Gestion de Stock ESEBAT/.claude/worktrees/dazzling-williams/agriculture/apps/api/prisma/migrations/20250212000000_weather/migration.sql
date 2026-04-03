-- CreateTable
CREATE TABLE "weather_daily" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "t_min" DOUBLE PRECISION,
    "t_max" DOUBLE PRECISION,
    "t_avg" DOUBLE PRECISION,
    "humidity_avg" DOUBLE PRECISION,
    "rainfall_mm" DOUBLE PRECISION,
    "wind_speed_avg" DOUBLE PRECISION,
    "provider" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_fetch_log" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "http_status" INTEGER,
    "error_code" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_fetch_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_daily_parcel_id_date_provider_key" ON "weather_daily"("parcel_id", "date", "provider");

-- CreateIndex
CREATE INDEX "weather_daily_parcel_id_idx" ON "weather_daily"("parcel_id");

-- CreateIndex
CREATE INDEX "weather_daily_date_idx" ON "weather_daily"("date");

-- CreateIndex
CREATE INDEX "weather_fetch_log_parcel_id_idx" ON "weather_fetch_log"("parcel_id");

-- CreateIndex
CREATE INDEX "weather_fetch_log_fetched_at_idx" ON "weather_fetch_log"("fetched_at");

-- AddForeignKey
ALTER TABLE "weather_daily" ADD CONSTRAINT "weather_daily_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
