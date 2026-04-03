-- CreateTable
CREATE TABLE "sensors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "serial_number" TEXT,
    "api_key" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_reading_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sensors_api_key_key" ON "sensors"("api_key");

-- CreateIndex
CREATE INDEX "sensors_parcel_id_idx" ON "sensors"("parcel_id");

-- CreateIndex
CREATE INDEX "sensors_type_idx" ON "sensors"("type");

-- CreateIndex
CREATE INDEX "sensors_api_key_idx" ON "sensors"("api_key");

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
