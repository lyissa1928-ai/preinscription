import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CropRequirementCreateInput, CropRequirementUpdateInput } from '@agriculture/shared';

export interface CropRequirementListItemDTO extends CropRequirementDTO {
  cropName?: string;
  regionName?: string;
}
export interface PaginatedCropRequirements {
  items: CropRequirementListItemDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CropRequirementDTO {
  id: string;
  cropId: string;
  regionId: string | null;
  season: string;
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
  notes: string | null;
  version: number;
  isActive: boolean;
}

@Injectable()
export class CropRequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(cropId?: string, regionId?: string): Promise<CropRequirementDTO[]> {
    const where: Record<string, unknown> = {};
    if (cropId) where.cropId = cropId;
    if (regionId) where.regionId = regionId;

    const reqs = await this.prisma.cropRequirement.findMany({
      where,
      include: { crop: true, region: true },
      orderBy: [{ crop: { name: 'asc' } }, { version: 'desc' }],
    });
    return reqs.map((r) => this.toDTO(r));
  }

  async listAdmin(
    actorId: string,
    params: {
      page: number;
      limit: number;
      cropId?: string;
      regionId?: string;
      season?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedCropRequirements> {
    const { page, limit, cropId, regionId, season, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (cropId) where.cropId = cropId;
    if (regionId) where.regionId = regionId;
    if (season) where.season = season;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.cropRequirement.findMany({
        where,
        include: { crop: true, region: true },
        orderBy: [{ crop: { name: 'asc' } }, { version: 'desc' }],
        skip,
        take: cappedLimit,
      }),
      this.prisma.cropRequirement.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        ...this.toDTO(r),
        cropName: (r as { crop?: { name: string } }).crop?.name,
        regionName: (r as { region?: { name: string } }).region?.name,
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(id: string): Promise<CropRequirementDTO> {
    const req = await this.prisma.cropRequirement.findUnique({
      where: { id },
      include: { crop: true, region: true },
    });
    if (!req) {
      throw new NotFoundException({
        code: 'CROP_REQUIREMENT_NOT_FOUND',
        message: 'Règle agronomique non trouvée',
      });
    }
    return this.toDTO(req);
  }

  async create(actorId: string, input: CropRequirementCreateInput): Promise<CropRequirementDTO> {
    const req = await this.prisma.cropRequirement.create({
      data: {
        cropId: input.cropId,
        regionId: input.regionId ?? null,
        season: input.season ?? 'ANY',
        phMin: input.phMin ?? null,
        phMax: input.phMax ?? null,
        soilMoistureMin: input.soilMoistureMin ?? null,
        soilMoistureMax: input.soilMoistureMax ?? null,
        salinityMax: input.salinityMax ?? null,
        rainfallMinMm: input.rainfallMinMm ?? null,
        rainfallMaxMm: input.rainfallMaxMm ?? null,
        tempMinC: input.tempMinC ?? null,
        tempMaxC: input.tempMaxC ?? null,
        weightPh: input.weightPh ?? 20,
        weightMoisture: input.weightMoisture ?? 20,
        weightSalinity: input.weightSalinity ?? 20,
        weightRainfall: input.weightRainfall ?? 20,
        weightTemp: input.weightTemp ?? 20,
        notes: input.notes ?? null,
      },
      include: { crop: true, region: true },
    });
    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'CropRequirement',
      entityId: req.id,
      after: { cropId: req.cropId, regionId: req.regionId, season: req.season, version: req.version },
    });
    return this.toDTO(req);
  }

  async update(actorId: string, id: string, input: CropRequirementUpdateInput): Promise<CropRequirementDTO> {
    const existing = await this.prisma.cropRequirement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'CROP_REQUIREMENT_NOT_FOUND',
        message: 'Règle agronomique non trouvée',
      });
    }

    const req = await this.prisma.cropRequirement.update({
      where: { id },
      data: {
        ...(input.regionId !== undefined && { regionId: input.regionId }),
        ...(input.season !== undefined && { season: input.season }),
        ...(input.phMin !== undefined && { phMin: input.phMin }),
        ...(input.phMax !== undefined && { phMax: input.phMax }),
        ...(input.soilMoistureMin !== undefined && { soilMoistureMin: input.soilMoistureMin }),
        ...(input.soilMoistureMax !== undefined && { soilMoistureMax: input.soilMoistureMax }),
        ...(input.salinityMax !== undefined && { salinityMax: input.salinityMax }),
        ...(input.rainfallMinMm !== undefined && { rainfallMinMm: input.rainfallMinMm }),
        ...(input.rainfallMaxMm !== undefined && { rainfallMaxMm: input.rainfallMaxMm }),
        ...(input.tempMinC !== undefined && { tempMinC: input.tempMinC }),
        ...(input.tempMaxC !== undefined && { tempMaxC: input.tempMaxC }),
        ...(input.weightPh !== undefined && { weightPh: input.weightPh }),
        ...(input.weightMoisture !== undefined && { weightMoisture: input.weightMoisture }),
        ...(input.weightSalinity !== undefined && { weightSalinity: input.weightSalinity }),
        ...(input.weightRainfall !== undefined && { weightRainfall: input.weightRainfall }),
        ...(input.weightTemp !== undefined && { weightTemp: input.weightTemp }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: { crop: true, region: true },
    });
    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'CropRequirement',
      entityId: id,
      before: { phMin: existing.phMin, phMax: existing.phMax, season: existing.season },
      after: { phMin: req.phMin, phMax: req.phMax, season: req.season },
    });
    return this.toDTO(req);
  }

  async setActive(actorId: string, id: string, isActive: boolean): Promise<CropRequirementDTO> {
    const before = await this.prisma.cropRequirement.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'CROP_REQUIREMENT_NOT_FOUND',
        message: 'Règle agronomique non trouvée',
      });
    }
    const req = await this.prisma.cropRequirement.update({
      where: { id },
      data: { isActive },
      include: { crop: true, region: true },
    });
    await this.audit.log({
      actorId,
      action: isActive ? 'ENABLE' : 'DISABLE',
      entity: 'CropRequirement',
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive: req.isActive },
    });
    return this.toDTO(req);
  }

  async cloneNewVersion(actorId: string, id: string): Promise<CropRequirementDTO> {
    const existing = await this.prisma.cropRequirement.findUnique({
      where: { id },
      include: { crop: true, region: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'CROP_REQUIREMENT_NOT_FOUND',
        message: 'Règle agronomique non trouvée',
      });
    }

    const newReq = await this.prisma.cropRequirement.create({
      data: {
        cropId: existing.cropId,
        regionId: existing.regionId,
        season: existing.season,
        phMin: existing.phMin,
        phMax: existing.phMax,
        soilMoistureMin: existing.soilMoistureMin,
        soilMoistureMax: existing.soilMoistureMax,
        salinityMax: existing.salinityMax,
        rainfallMinMm: existing.rainfallMinMm,
        rainfallMaxMm: existing.rainfallMaxMm,
        tempMinC: existing.tempMinC,
        tempMaxC: existing.tempMaxC,
        weightPh: existing.weightPh,
        weightMoisture: existing.weightMoisture,
        weightSalinity: existing.weightSalinity,
        weightRainfall: existing.weightRainfall,
        weightTemp: existing.weightTemp,
        notes: existing.notes,
        version: existing.version + 1,
      },
      include: { crop: true, region: true },
    });
    await this.audit.log({
      actorId,
      action: 'VERSION_CREATE',
      entity: 'CropRequirement',
      entityId: newReq.id,
      after: { cropId: newReq.cropId, version: newReq.version },
    });
    return this.toDTO(newReq);
  }

  private toDTO(r: {
    id: string;
    cropId: string;
    regionId: string | null;
    season: string;
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
    notes: string | null;
    version: number;
    isActive: boolean;
  }): CropRequirementDTO {
    return {
      id: r.id,
      cropId: r.cropId,
      regionId: r.regionId,
      season: r.season,
      phMin: r.phMin,
      phMax: r.phMax,
      soilMoistureMin: r.soilMoistureMin,
      soilMoistureMax: r.soilMoistureMax,
      salinityMax: r.salinityMax,
      rainfallMinMm: r.rainfallMinMm,
      rainfallMaxMm: r.rainfallMaxMm,
      tempMinC: r.tempMinC,
      tempMaxC: r.tempMaxC,
      weightPh: r.weightPh,
      weightMoisture: r.weightMoisture,
      weightSalinity: r.weightSalinity,
      weightRainfall: r.weightRainfall,
      weightTemp: r.weightTemp,
      notes: r.notes,
      version: r.version,
      isActive: r.isActive,
    };
  }
}
