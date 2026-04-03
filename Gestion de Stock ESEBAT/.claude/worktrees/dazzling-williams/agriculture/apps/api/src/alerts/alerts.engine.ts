import { Injectable } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';
import type { AlertRuleCondition } from '@agriculture/shared';

interface ParcelContext {
  id: string;
  farmId: string;
  regionId: string;
  farmerUserId: string;
  soilProfile?: { ph: number | null; soilMoisture: number | null; salinity: number | null } | null;
  weather: Array<{ tMin?: number; tMax?: number; tAvg?: number; rainfallMm?: number }>;
}

interface RuleContext {
  id: string;
  type: string;
  severity: string;
  conditions: unknown;
  windowDays: number | null;
  cooldownHours: number;
  messageTemplate: string;
}

interface EvalResult {
  triggered: boolean;
  title?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class AlertsEngine {
  constructor(private readonly repo: AlertsRepository) {}

  evalRule(rule: RuleContext, parcel: ParcelContext): EvalResult {
    const conds = Array.isArray(rule.conditions)
      ? (rule.conditions as AlertRuleCondition[])
      : [rule.conditions as AlertRuleCondition];

    for (const c of conds) {
      const result = this.evalCondition(c, parcel, rule.windowDays);
      if (result.triggered) {
        const title = this.getTitle(rule.type);
        const message = this.formatMessage(rule.messageTemplate, result.meta ?? {});
        return { triggered: true, title, message, meta: result.meta };
      }
    }
    return { triggered: false };
  }

  private evalCondition(
    cond: AlertRuleCondition,
    parcel: ParcelContext,
    windowDays: number | null,
  ): { triggered: boolean; meta?: Record<string, unknown> } {
    const days = cond.days ?? windowDays ?? 1;
    let value: number | null = null;

    switch (cond.metric) {
      case 'soilMoisture':
        value = parcel.soilProfile?.soilMoisture ?? null;
        break;
      case 'ph':
        value = parcel.soilProfile?.ph ?? null;
        break;
      case 'salinity':
        value = parcel.soilProfile?.salinity ?? null;
        break;
      case 'rainfallSumDays':
        value = parcel.weather
          .slice(-days)
          .reduce((s, w) => s + (w.rainfallMm ?? 0), 0);
        break;
      case 'tempMaxDays':
        value =
          parcel.weather.length > 0
            ? Math.max(
                ...parcel.weather
                  .slice(-days)
                  .map((w) => w.tMax ?? w.tAvg ?? -999)
                  .filter((v) => v > -999),
              )
            : null;
        break;
      case 'tempAvgDays':
        const temps = parcel.weather
          .slice(-days)
          .flatMap((w) => (w.tAvg != null ? [w.tAvg] : w.tMin != null && w.tMax != null ? [(w.tMin + w.tMax) / 2] : []));
        value = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
        break;
      default:
        return { triggered: false };
    }

    if (value == null) return { triggered: false };

    const meta: Record<string, unknown> = {
      [cond.metric]: value,
      threshold: cond.value,
      days: cond.days ?? days,
    };

    const triggered = this.compare(value, cond.operator, cond.value);
    return { triggered, meta };
  }

  private compare(a: number, op: string, b: number): boolean {
    switch (op) {
      case '<':
        return a < b;
      case '>':
        return a > b;
      case '<=':
        return a <= b;
      case '>=':
        return a >= b;
      case '==':
        return Math.abs(a - b) < 0.001;
      default:
        return false;
    }
  }

  private getTitle(type: string): string {
    const titles: Record<string, string> = {
      SOIL_MOISTURE_LOW: 'Humidité du sol faible',
      SOIL_PH_OUT_OF_RANGE: 'pH hors plage',
      SOIL_SALINITY_HIGH: 'Salinité élevée',
      HEAT_WAVE_RISK: 'Risque de vague de chaleur',
      HEAVY_RAIN_RISK: 'Risque de forte pluie',
      DROUGHT_RISK: 'Risque de sécheresse',
    };
    return titles[type] ?? type;
  }

  private formatMessage(template: string, meta: Record<string, unknown>): string {
    let msg = template;
    for (const [k, v] of Object.entries(meta)) {
      msg = msg.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
    return msg;
  }

  buildFingerprint(ruleId: string, parcelId: string, windowKey: string): string {
    return `alert:${ruleId}:${parcelId}:${windowKey}`;
  }

  getWindowKey(rule: RuleContext): string {
    const now = new Date();
    const d = now.toISOString().slice(0, 10);
    if (rule.windowDays != null && rule.windowDays > 0) {
      return `w${rule.windowDays}:${d}`;
    }
    return d;
  }
}
