import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AlertsRepository } from './alerts.repository';
import { AlertsEngine } from './alerts.engine';

@Injectable()
export class AlertsCronService {
  constructor(
    private readonly repo: AlertsRepository,
    private readonly engine: AlertsEngine,
    private readonly config: ConfigService,
  ) {}

  private getBatchSize(): number {
    return this.config.get<number>('ALERTS_BATCH_SIZE', 200);
  }

  private getDefaultCooldownHours(): number {
    return this.config.get<number>('ALERTS_DEFAULT_COOLDOWN_HOURS', 24);
  }

  @Cron('*/30 * * * *')
  async evaluateAlerts() {
    const batchSize = this.getBatchSize();
    const rules = await this.repo.getActiveRules();
    if (rules.length === 0) return;

    let skip = 0;
    let totalProcessed = 0;

    while (true) {
      const parcels = await this.repo.getParcelsBatch(skip, batchSize);
      if (parcels.length === 0) break;

      const parcelIds = parcels.map((p) => p.id);
      const maxDays = Math.max(
        ...rules
          .map((r) => (r.conditions as { days?: number })?.days ?? r.windowDays ?? 1)
          .filter((d): d is number => d != null),
        14,
      );
      const weatherRecords = await this.repo.getWeatherForParcels(parcelIds, maxDays);

      const weatherByParcel = new Map<string, typeof weatherRecords>();
      for (const w of weatherRecords) {
        const list = weatherByParcel.get(w.parcelId) ?? [];
        list.push(w);
        weatherByParcel.set(w.parcelId, list);
      }

      for (const parcel of parcels) {
        const farmerUserId = parcel.farm.userId;
        const weather = (weatherByParcel.get(parcel.id) ?? []).map((r) => ({
          tMin: r.tMin ?? undefined,
          tMax: r.tMax ?? undefined,
          tAvg: r.tAvg ?? undefined,
          rainfallMm: r.rainfallMm ?? undefined,
        }));

        const context = {
          id: parcel.id,
          farmId: parcel.farmId,
          regionId: parcel.regionId,
          farmerUserId,
          soilProfile: parcel.soilProfile,
          weather,
        };

        for (const rule of rules) {
          if (!this.ruleAppliesToParcel(rule, parcel)) continue;

          const result = this.engine.evalRule(
            {
              id: rule.id,
              type: rule.type,
              severity: rule.severity,
              conditions: rule.conditions,
              windowDays: rule.windowDays,
              cooldownHours: rule.cooldownHours,
              messageTemplate: rule.messageTemplate,
            },
            context,
          );

          if (!result.triggered || !result.title || !result.message) continue;

          const windowKey = this.engine.getWindowKey({
            id: rule.id,
            type: rule.type,
            severity: rule.severity,
            conditions: rule.conditions,
            windowDays: rule.windowDays,
            cooldownHours: rule.cooldownHours,
            messageTemplate: rule.messageTemplate,
          });
          const fingerprint = this.engine.buildFingerprint(rule.id, parcel.id, windowKey);

          const existing = await this.repo.findByFingerprint(fingerprint);
          if (existing) continue;

          const cooldownHours = rule.cooldownHours ?? this.getDefaultCooldownHours();
          const cooldownSince = new Date();
          cooldownSince.setHours(cooldownSince.getHours() - cooldownHours);
          const lastAlert = await this.repo.findLastForRuleParcel(rule.id, parcel.id, cooldownSince);
          if (lastAlert) continue;

          await this.repo.create({
            farmerUserId,
            parcelId: parcel.id,
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity,
            title: result.title,
            message: result.message,
            fingerprint,
            meta: result.meta ?? undefined,
          });
        }
      }

      totalProcessed += parcels.length;
      skip += batchSize;
      if (parcels.length < batchSize) break;
    }
  }

  private ruleAppliesToParcel(
    rule: { scope: string; regionId: string | null; parcelId: string | null },
    parcel: { id: string; regionId: string },
  ): boolean {
    if (rule.scope === 'GLOBAL') return true;
    if (rule.scope === 'REGION' && rule.regionId === parcel.regionId) return true;
    if (rule.scope === 'PARCEL' && rule.parcelId === parcel.id) return true;
    return false;
  }
}
