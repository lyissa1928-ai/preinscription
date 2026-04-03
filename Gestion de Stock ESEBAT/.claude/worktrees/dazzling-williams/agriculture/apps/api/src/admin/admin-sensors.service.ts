import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { randomBytes } from 'crypto';
import type { CreateSensorDto, UpdateSensorDto, IotIngestDto } from './dto/sensor.dto';

export interface SensorDTO {
  id: string;
  name: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
  apiKey: string;
  parcelId: string;
  parcelName?: string;
  farmName?: string;
  isActive: boolean;
  lastReadingAt: string | null;
  createdAt: string;
}

export interface ParcelOptionDTO {
  id: string;
  name: string;
  area: number;
  farmName: string;
  regionName: string;
}

@Injectable()
export class AdminSensorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private generateApiKey(): string {
    return `sk_${randomBytes(24).toString('hex')}`;
  }

  async list(
    actorId: string,
    params: {
      page: number;
      limit: number;
      q?: string;
      type?: string;
      parcelId?: string;
      isActive?: boolean;
    },
  ): Promise<{ items: SensorDTO[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page, limit, q, type, parcelId, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (parcelId) where.parcelId = parcelId;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.sensor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
        include: {
          parcel: {
            include: {
              farm: true,
              region: true,
            },
          },
        },
      }),
      this.prisma.sensor.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        model: s.model,
        serialNumber: s.serialNumber,
        apiKey: s.apiKey,
        parcelId: s.parcelId,
        parcelName: s.parcel.name,
        farmName: s.parcel.farm.name,
        isActive: s.isActive,
        lastReadingAt: s.lastReadingAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(actorId: string, id: string): Promise<SensorDTO> {
    const s = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        parcel: {
          include: { farm: true, region: true },
        },
      },
    });
    if (!s) {
      throw new NotFoundException({ code: 'SENSOR_NOT_FOUND', message: 'Capteur non trouvé' });
    }
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      model: s.model,
      serialNumber: s.serialNumber,
      apiKey: s.apiKey,
      parcelId: s.parcelId,
      parcelName: s.parcel.name,
      farmName: s.parcel.farm.name,
      isActive: s.isActive,
      lastReadingAt: s.lastReadingAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    };
  }

  async create(actorId: string, dto: CreateSensorDto): Promise<SensorDTO> {
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: dto.parcelId, deletedAt: null },
      include: { farm: true, region: true },
    });
    if (!parcel) {
      throw new BadRequestException({ code: 'PARCEL_NOT_FOUND', message: 'Parcelle non trouvée' });
    }

    const apiKey = this.generateApiKey();
    const sensor = await this.prisma.sensor.create({
      data: {
        name: dto.name,
        type: dto.type,
        model: dto.model ?? null,
        serialNumber: dto.serialNumber ?? null,
        apiKey,
        parcelId: dto.parcelId,
      },
      include: {
        parcel: {
          include: { farm: true, region: true },
        },
      },
    });

    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'Sensor',
      entityId: sensor.id,
      after: { name: sensor.name, type: sensor.type },
    });

    return {
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      model: sensor.model,
      serialNumber: sensor.serialNumber,
      apiKey: sensor.apiKey,
      parcelId: sensor.parcelId,
      parcelName: sensor.parcel.name,
      farmName: sensor.parcel.farm.name,
      isActive: sensor.isActive,
      lastReadingAt: sensor.lastReadingAt?.toISOString() ?? null,
      createdAt: sensor.createdAt.toISOString(),
    };
  }

  async update(actorId: string, id: string, dto: UpdateSensorDto): Promise<SensorDTO> {
    const existing = await this.prisma.sensor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'SENSOR_NOT_FOUND', message: 'Capteur non trouvé' });
    }

    if (dto.parcelId) {
      const parcel = await this.prisma.parcel.findFirst({
        where: { id: dto.parcelId, deletedAt: null },
      });
      if (!parcel) {
        throw new BadRequestException({ code: 'PARCEL_NOT_FOUND', message: 'Parcelle non trouvée' });
      }
    }

    const sensor = await this.prisma.sensor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
        ...(dto.parcelId !== undefined && { parcelId: dto.parcelId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        parcel: {
          include: { farm: true, region: true },
        },
      },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Sensor',
      entityId: sensor.id,
      after: dto as Record<string, unknown>,
    });

    return this.getOne(actorId, sensor.id);
  }

  async regenerateApiKey(actorId: string, id: string): Promise<{ apiKey: string }> {
    const existing = await this.prisma.sensor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'SENSOR_NOT_FOUND', message: 'Capteur non trouvé' });
    }

    const apiKey = this.generateApiKey();
    await this.prisma.sensor.update({
      where: { id },
      data: { apiKey },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Sensor',
      entityId: id,
      after: { action: 'regenerateApiKey' },
    });

    return { apiKey };
  }

  async ingestByApiKey(apiKey: string, data: IotIngestDto): Promise<{ success: boolean }> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { apiKey, isActive: true },
      include: { parcel: true },
    });
    if (!sensor) {
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Clé API invalide ou capteur inactif' });
    }

    const hasData = data.ph !== undefined || data.soilMoisture !== undefined || data.salinity !== undefined;
    if (!hasData) {
      throw new BadRequestException({ code: 'NO_DATA', message: 'Aucune donnée à ingérer' });
    }

    const existing = await this.prisma.parcelSoilProfile.findUnique({
      where: { parcelId: sensor.parcelId },
    });

    const updateData = {
      ph: data.ph !== undefined ? data.ph : existing?.ph ?? null,
      soilMoisture: data.soilMoisture !== undefined ? data.soilMoisture : existing?.soilMoisture ?? null,
      salinity: data.salinity !== undefined ? data.salinity : existing?.salinity ?? null,
    };

    if (existing) {
      await this.prisma.parcelSoilProfile.update({
        where: { parcelId: sensor.parcelId },
        data: updateData,
      });
    } else {
      await this.prisma.parcelSoilProfile.create({
        data: { parcelId: sensor.parcelId, ...updateData },
      });
    }

    await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { lastReadingAt: new Date() },
    });

    return { success: true };
  }

  async listParcelsForSensors(): Promise<ParcelOptionDTO[]> {
    const parcels = await this.prisma.parcel.findMany({
      where: { deletedAt: null },
      include: {
        farm: true,
        region: true,
      },
      orderBy: [{ farm: { name: 'asc' } }, { name: 'asc' }],
    });

    return parcels.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      farmName: p.farm.name,
      regionName: p.region.name,
    }));
  }
}
