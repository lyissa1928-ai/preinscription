-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "region_id" TEXT,
    "parcel_id" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "window_days" INTEGER,
    "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
    "message_template" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "farmer_user_id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "acked_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "muted_until" TIMESTAMP(3),
    "fingerprint" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alerts_fingerprint_key" ON "alerts"("fingerprint");

-- CreateIndex
CREATE INDEX "alert_rules_type_is_active_idx" ON "alert_rules"("type", "is_active");

-- CreateIndex
CREATE INDEX "alert_rules_region_id_idx" ON "alert_rules"("region_id");

-- CreateIndex
CREATE INDEX "alert_rules_parcel_id_idx" ON "alert_rules"("parcel_id");

-- CreateIndex
CREATE INDEX "alerts_farmer_user_id_idx" ON "alerts"("farmer_user_id");

-- CreateIndex
CREATE INDEX "alerts_parcel_id_idx" ON "alerts"("parcel_id");

-- CreateIndex
CREATE INDEX "alerts_rule_id_idx" ON "alerts"("rule_id");

-- CreateIndex
CREATE INDEX "alerts_triggered_at_idx" ON "alerts"("triggered_at");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alert_events_alert_id_idx" ON "alert_events"("alert_id");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
