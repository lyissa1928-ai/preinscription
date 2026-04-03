-- Add isActive to Region and Crop for soft delete
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "crops" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS "regions_is_active_idx" ON "regions"("is_active");
CREATE INDEX IF NOT EXISTS "crops_is_active_idx" ON "crops"("is_active");
