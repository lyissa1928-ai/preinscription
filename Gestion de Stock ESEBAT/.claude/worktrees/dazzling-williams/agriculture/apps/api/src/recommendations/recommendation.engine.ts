import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherRepository } from '../weather/weather.repository';
import {
  ENGINE_VERSION,
  RAINY_MONTHS,
  MISSING_DATA_PENALTY,
  DEFAULT_THRESHOLD,
} from './constants';
import type { RecommendationResultDTO, RecommendationDTO } from '@agriculture/shared';

interface EngineInputs {
  parcelId: string;
  regionId: string;
  ph: number | null;
  soilMoisture: number | null;
  salinity: number | null;
  rainfallMm: number | null;
  tempAvgC: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  season: string;
  historyDays: number;
}

interface CriterionResult {
  points: number;
  positive?: string;
  negative?: string;
  missing?: string;
}

@Injectable()
export class RecommendationEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherRepo: WeatherRepository,
  ) {}

  static getSeasonFromMonth(month: number): 'DRY' | 'RAINY' {
    return RAINY_MONTHS.includes(month) ? 'RAINY' : 'DRY';
  }

  async run(
    parcelId: string,
    userId: string,
    seasonOverride: 'DRY' | 'RAINY' | null,
    historyDays: number,
    threshold: number = DEFAULT_THRESHOLD,
    isAdmin = false,
  ): Promise<{
    recommendationId: string;
    results: RecommendationResultDTO[];
    inputs: Record<string, unknown>;
    season: string;
    topCropId: string | null;
    topScore: number | null;
  }> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { region: true, soilProfile: true, farm: true },
    });
    if (!parcel || parcel.deletedAt) {
      throw new Error('PARCEL_NOT_FOUND');
    }
    if (!isAdmin && parcel.farm.userId !== userId) {
      throw new Error('PARCEL_OWNERSHIP_DENIED');
    }

    const season =
      seasonOverride ??
      RecommendationEngine.getSeasonFromMonth(new Date().getMonth() + 1);

    const weatherItems = await this.weatherRepo.getHistoryDaily(parcelId, historyDays);
    let rainfallMm: number | null = null;
    let tempAvgC: number | null = null;
    let tempMinC: number | null = null;
    let tempMaxC: number | null = null;
    if (weatherItems.length > 0) {
      rainfallMm = weatherItems.reduce((s, i) => s + (i.rainfallMm ?? 0), 0);
      const temps = weatherItems.flatMap((i) => {
        const vals: number[] = [];
        if (i.tAvg != null) vals.push(i.tAvg);
        else if (i.tMin != null && i.tMax != null)
          vals.push((i.tMin + i.tMax) / 2);
        return vals;
      });
      if (temps.length > 0) {
        tempAvgC = temps.reduce((a, b) => a + b, 0) / temps.length;
        const mins = weatherItems
          .map((i) => i.tMin)
          .filter((t): t is number => t != null);
        const maxs = weatherItems
          .map((i) => i.tMax)
          .filter((t): t is number => t != null);
        tempMinC = mins.length > 0 ? Math.min(...mins) : null;
        tempMaxC = maxs.length > 0 ? Math.max(...maxs) : null;
      }
    }

    const inputs: EngineInputs = {
      parcelId,
      regionId: parcel.regionId,
      ph: parcel.soilProfile?.ph ?? null,
      soilMoisture: parcel.soilProfile?.soilMoisture ?? null,
      salinity: parcel.soilProfile?.salinity ?? null,
      rainfallMm,
      tempAvgC,
      tempMinC,
      tempMaxC,
      season,
      historyDays,
    };

    const requirements = await this.prisma.cropRequirement.findMany({
      where: {
        isActive: true,
        crop: { isActive: true },
        AND: [
          { OR: [{ regionId: null }, { regionId: parcel.regionId }] },
          { OR: [{ season: 'ANY' }, { season }] },
        ],
      },
      include: { crop: true },
    });

    const cropToReqs = new Map<string, typeof requirements>();
    for (const r of requirements) {
      const list = cropToReqs.get(r.cropId) ?? [];
      list.push(r);
      cropToReqs.set(r.cropId, list);
    }

    const results: RecommendationResultDTO[] = [];
    for (const [cropId, reqs] of cropToReqs) {
      const req = reqs[0]!;
      const crop = req.crop;
      const { score, positiveReasons, negativeReasons, missingData, explainText } =
        this.scoreCrop(req, inputs);
      results.push({
        cropId,
        cropName: crop.name,
        score: Math.round(Math.max(0, Math.min(100, score))),
        recommended: score >= threshold,
        positiveReasons,
        negativeReasons,
        missingData,
        explainText,
      });
    }

    results.sort((a, b) => b.score - a.score);
    const top5 = results.slice(0, 5);
    const top = top5[0];

    const rec = await this.prisma.recommendation.create({
      data: {
        parcelId,
        generatedByUserId: userId,
        generatedAt: new Date(),
        engineVersion: ENGINE_VERSION,
        season,
        inputs: JSON.parse(JSON.stringify(inputs)),
        results: JSON.parse(JSON.stringify(top5)),
        topCropId: top?.cropId ?? null,
      },
    });

    for (const r of top5) {
      await this.prisma.recommendationItem.create({
        data: {
          recommendationId: rec.id,
          cropId: r.cropId,
          score: r.score,
          reasons: {
            positive: r.positiveReasons,
            negative: r.negativeReasons,
            missing: r.missingData,
            explainText: r.explainText,
          },
          constraints: {},
        },
      });
    }

    return {
      recommendationId: rec.id,
      results: top5,
      inputs: inputs as unknown as Record<string, unknown>,
      season,
      topCropId: top?.cropId ?? null,
      topScore: top?.score ?? null,
    };
  }

  private scoreCrop(
    req: {
      phMin: number | null;
      phMax: number | null;
      soilMoistureMin: number | null;
      soilMoistureMax: number | null;
      salinityMax: number | null;
      rainfallMinMm: number | null;
      rainfallMaxMm: number | null;
      tempMinC: number | null;
      tempMaxC: number | null;
      weightPh: number;
      weightMoisture: number;
      weightSalinity: number;
      weightRainfall: number;
      weightTemp: number;
    },
    inputs: EngineInputs,
  ): {
    score: number;
    positiveReasons: string[];
    negativeReasons: string[];
    missingData: string[];
    explainText: string;
  } {
    const positiveReasons: string[] = [];
    const negativeReasons: string[] = [];
    const missingData: string[] = [];
    let totalPoints = 0;
    const totalWeight =
      req.weightPh + req.weightMoisture + req.weightSalinity + req.weightRainfall + req.weightTemp;

    const phRes = this.evalPh(req.phMin, req.phMax, inputs.ph, req.weightPh);
    totalPoints += phRes.points;
    if (phRes.positive) positiveReasons.push(phRes.positive);
    if (phRes.negative) negativeReasons.push(phRes.negative);
    if (phRes.missing) missingData.push(phRes.missing);

    const moistRes = this.evalMoisture(
      req.soilMoistureMin,
      req.soilMoistureMax,
      inputs.soilMoisture,
      req.weightMoisture,
    );
    totalPoints += moistRes.points;
    if (moistRes.positive) positiveReasons.push(moistRes.positive);
    if (moistRes.negative) negativeReasons.push(moistRes.negative);
    if (moistRes.missing) missingData.push(moistRes.missing);

    const salRes = this.evalSalinity(req.salinityMax, inputs.salinity, req.weightSalinity);
    totalPoints += salRes.points;
    if (salRes.positive) positiveReasons.push(salRes.positive);
    if (salRes.negative) negativeReasons.push(salRes.negative);
    if (salRes.missing) missingData.push(salRes.missing);

    const rainRes = this.evalRainfall(
      req.rainfallMinMm,
      req.rainfallMaxMm,
      inputs.rainfallMm,
      req.weightRainfall,
    );
    totalPoints += rainRes.points;
    if (rainRes.positive) positiveReasons.push(rainRes.positive);
    if (rainRes.negative) negativeReasons.push(rainRes.negative);
    if (rainRes.missing) missingData.push(rainRes.missing);

    const tempRes = this.evalTemp(
      req.tempMinC,
      req.tempMaxC,
      inputs.tempAvgC ?? inputs.tempMinC ?? inputs.tempMaxC,
      req.weightTemp,
    );
    totalPoints += tempRes.points;
    if (tempRes.positive) positiveReasons.push(tempRes.positive);
    if (tempRes.negative) negativeReasons.push(tempRes.negative);
    if (tempRes.missing) missingData.push(tempRes.missing);

    const score = totalPoints > 0 ? (totalPoints / totalWeight) * 100 : 0;

    const pos = positiveReasons.slice(0, 3);
    const neg = negativeReasons.slice(0, 2);
    const explainParts = [...pos];
    if (neg.length > 0) {
      explainParts.push(neg[0]!);
    }
    const explainText = explainParts.length > 0
      ? explainParts.join('. ')
      : 'Données insuffisantes pour une analyse détaillée.';

    return {
      score,
      positiveReasons: pos,
      negativeReasons: neg,
      missingData,
      explainText,
    };
  }

  private evalPh(
    phMin: number | null,
    phMax: number | null,
    ph: number | null,
    weight: number,
  ): CriterionResult {
    if (ph == null) {
      return {
        points: -MISSING_DATA_PENALTY,
        missing: 'pH non renseigné: précision recommandée',
      };
    }
    const min = phMin ?? 0;
    const max = phMax ?? 14;
    if (ph >= min && ph <= max) {
      return {
        points: weight,
        positive: `pH (${ph.toFixed(1)}) compatible avec la plage (${min}-${max})`,
      };
    }
    return {
      points: 0,
      negative: `pH (${ph.toFixed(1)}) hors plage recommandée (${min}-${max})`,
    };
  }

  private evalMoisture(
    minV: number | null,
    maxV: number | null,
    val: number | null,
    weight: number,
  ): CriterionResult {
    if (val == null) {
      return {
        points: -MISSING_DATA_PENALTY,
        missing: 'Humidité sol non renseignée',
      };
    }
    const min = minV ?? 0;
    const max = maxV ?? 100;
    if (val >= min && val <= max) {
      return {
        points: weight,
        positive: `Humidité (${val}%) dans la plage (${min}-${max}%)`,
      };
    }
    return {
      points: 0,
      negative: `Humidité (${val}%) hors plage (${min}-${max}%)`,
    };
  }

  private evalSalinity(
    maxV: number | null,
    val: number | null,
    weight: number,
  ): CriterionResult {
    if (val == null) {
      return {
        points: -MISSING_DATA_PENALTY,
        missing: 'Salinité non renseignée',
      };
    }
    const max = maxV ?? 100;
    if (val <= max) {
      return {
        points: weight,
        positive: `Salinité (${val.toFixed(1)}) acceptable (≤${max})`,
      };
    }
    return {
      points: 0,
      negative: `Salinité (${val.toFixed(1)}) trop élevée (max ${max})`,
    };
  }

  private evalRainfall(
    minV: number | null,
    maxV: number | null,
    val: number | null,
    weight: number,
  ): CriterionResult {
    if (val == null) {
      return {
        points: -MISSING_DATA_PENALTY,
        missing: 'Pluviométrie non disponible (données météo manquantes)',
      };
    }
    const min = minV ?? 0;
    const max = maxV ?? 10000;
    if (val >= min && val <= max) {
      return {
        points: weight,
        positive: `Pluie (${Math.round(val)}mm) dans la plage adaptée`,
      };
    }
    if (val < min) {
      return {
        points: 0,
        negative: `Pluie (${Math.round(val)}mm) insuffisante (min ${min}mm)`,
      };
    }
    return {
      points: 0,
      negative: `Pluie (${Math.round(val)}mm) excessive (max ${max}mm)`,
    };
  }

  async listByParcel(
    userId: string,
    parcelId: string,
    page: number,
    limit: number,
    isAdmin: boolean,
  ): Promise<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.ensureAccess(userId, parcelId, isAdmin);
    const where = { parcelId };
    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recommendation.count({ where }),
    ]);
    const data = items.map((r) => this.recommendationToDTO(r)) as RecommendationDTO[];
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listAll(
    userId: string,
    page: number,
    limit: number,
    isAdmin: boolean,
  ): Promise<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const where = await this.recommendationsWhere(userId, isAdmin);
    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { parcel: true },
      }),
      this.prisma.recommendation.count({ where }),
    ]);
    const data = items.map((r) => this.recommendationToDTO(r)) as RecommendationDTO[];
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(
    userId: string,
    recommendationId: string,
    isAdmin: boolean,
  ): Promise<RecommendationDTO> {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: { parcel: true, items: true },
    });
    if (!rec) {
      throw new Error('RECOMMENDATION_NOT_FOUND');
    }
    await this.ensureAccess(userId, rec.parcelId, isAdmin);
    return this.recommendationToDTO(rec) as RecommendationDTO;
  }

  private async ensureAccess(userId: string, parcelId: string, isAdmin: boolean): Promise<void> {
    if (isAdmin) return;
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { farm: true },
    });
    if (!parcel || parcel.farm.userId !== userId) {
      throw new Error('PARCEL_OWNERSHIP_DENIED');
    }
  }

  private async recommendationsWhere(
    userId: string,
    isAdmin: boolean,
  ): Promise<{ parcel: { farmId: string; deletedAt: null } } | Record<string, never>> {
    if (isAdmin) return {};
    const farm = await this.prisma.farm.findUnique({ where: { userId } });
    if (!farm) return { parcel: { farmId: 'none', deletedAt: null } };
    return { parcel: { farmId: farm.id, deletedAt: null } };
  }

  private recommendationToDTO(r: {
    id: string;
    parcelId: string;
    generatedAt: Date;
    engineVersion: string;
    season: string;
    inputs: unknown;
    results: unknown;
    topCropId: string | null;
    parcel?: { id: string };
    items?: Array<{ cropId: string; score: number; reasons: unknown }>;
  }) {
    const results = Array.isArray(r.results) ? r.results : [];
    const top = results[0] as { cropId?: string; cropName?: string; score?: number } | undefined;
    return {
      id: r.id,
      parcelId: r.parcelId,
      generatedAt: r.generatedAt.toISOString(),
      engineVersion: r.engineVersion,
      season: r.season,
      topCropId: r.topCropId,
      topCropName: top?.cropName ?? null,
      topScore: top?.score ?? null,
      results,
      inputs: r.inputs as Record<string, unknown>,
    };
  }

  private evalTemp(
    minV: number | null,
    maxV: number | null,
    val: number | null,
    weight: number,
  ): CriterionResult {
    if (val == null) {
      return {
        points: -MISSING_DATA_PENALTY,
        missing: 'Température non disponible (données météo manquantes)',
      };
    }
    const min = minV ?? -10;
    const max = maxV ?? 50;
    if (val >= min && val <= max) {
      return {
        points: weight,
        positive: `Température (${val.toFixed(0)}°C) adaptée`,
      };
    }
    return {
      points: 0,
      negative: `Température (${val.toFixed(0)}°C) hors plage (${min}-${max}°C)`,
    };
  }
}
