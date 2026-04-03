import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ParcelDTO, Paginated } from '@agriculture/shared';
import type { ParcelCreateInput, ParcelUpdateInput } from '@agriculture/shared';

@Injectable()
export class ParcelsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getFarmId(userId: string): Promise<string> {
    const farm = await this.prisma.farm.findUnique({
      where: { userId },
    });
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée. Créez d\'abord votre exploitation.',
      });
    }
    return farm.id;
  }

  async list(
    userId: string,
    page = 1,
    limit = 10,
    sort = 'createdAt:desc',
    search?: string,
  ): Promise<Paginated<ParcelDTO>> {
    const farmId = await this.getFarmId(userId);
    const [sortField, sortOrder] = sort.split(':');
    const orderBy = { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const where: Record<string, unknown> = {
      farmId,
      deletedAt: null,
    };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.parcel.findMany({
        where,
        include: { region: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.parcel.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((p) => this.toDTO(p)),
      meta: { total, page, limit, totalPages },
    };
  }

  async getOne(userId: string, id: string): Promise<ParcelDTO> {
    const farmId = await this.getFarmId(userId);
    const parcel = await this.prisma.parcel.findFirst({
      where: { id, farmId, deletedAt: null },
      include: { region: true },
    });
    if (!parcel) {
      throw new NotFoundException({
        code: 'PARCEL_NOT_FOUND',
        message: 'Parcelle non trouvée',
      });
    }
    return this.toDTO(parcel);
  }

  async create(userId: string, input: ParcelCreateInput): Promise<ParcelDTO> {
    const farmId = await this.getFarmId(userId);
    const parcel = await this.prisma.parcel.create({
      data: {
        farmId,
        name: input.name,
        area: input.area,
        regionId: input.regionId,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        soilType: input.soilType,
        status: input.status || 'ACTIVE',
      },
      include: { region: true },
    });
    return this.toDTO(parcel);
  }

  async update(
    userId: string,
    id: string,
    input: ParcelUpdateInput,
  ): Promise<ParcelDTO> {
    const farmId = await this.getFarmId(userId);
    const existing = await this.prisma.parcel.findFirst({
      where: { id, farmId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'PARCEL_NOT_FOUND',
        message: 'Parcelle non trouvée',
      });
    }

    const parcel = await this.prisma.parcel.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.area !== undefined && { area: input.area }),
        ...(input.regionId !== undefined && { regionId: input.regionId }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.soilType !== undefined && { soilType: input.soilType }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { region: true },
    });
    return this.toDTO(parcel);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const farmId = await this.getFarmId(userId);
    const parcel = await this.prisma.parcel.findFirst({
      where: { id, farmId, deletedAt: null },
    });
    if (!parcel) {
      throw new NotFoundException({
        code: 'PARCEL_NOT_FOUND',
        message: 'Parcelle non trouvée',
      });
    }
    await this.prisma.parcel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(userId: string): Promise<{
    totalParcels: number;
    totalArea: number;
    mainRegion: { id: string; name: string } | null;
  }> {
    const farmId = await this.getFarmId(userId);
    const parcels = await this.prisma.parcel.findMany({
      where: { farmId, deletedAt: null },
      include: { region: true },
    });
    const totalParcels = parcels.length;
    const totalArea = parcels.reduce((s, p) => s + p.area, 0);
    const byRegion = parcels.reduce<Record<string, number>>((acc, p) => {
      acc[p.regionId] = (acc[p.regionId] || 0) + 1;
      return acc;
    }, {});
    const mainRegionId = Object.entries(byRegion).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const mainRegion = mainRegionId
      ? parcels.find((p) => p.regionId === mainRegionId)?.region
      : null;
    return {
      totalParcels,
      totalArea,
      mainRegion: mainRegion
        ? { id: mainRegion.id, name: mainRegion.name }
        : null,
    };
  }

  async getRecent(userId: string, limit = 5): Promise<ParcelDTO[]> {
    const farmId = await this.getFarmId(userId);
    const parcels = await this.prisma.parcel.findMany({
      where: { farmId, deletedAt: null },
      include: { region: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return parcels.map((p) => this.toDTO(p));
  }

  private toDTO(parcel: {
    id: string;
    farmId: string;
    name: string;
    area: number;
    regionId: string;
    latitude: number | null;
    longitude: number | null;
    soilType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    region: { id: string; name: string; zone: string };
  }): ParcelDTO {
    return {
      id: parcel.id,
      farmId: parcel.farmId,
      name: parcel.name,
      area: parcel.area,
      regionId: parcel.regionId,
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      soilType: parcel.soilType as ParcelDTO['soilType'],
      status: parcel.status as ParcelDTO['status'],
      createdAt: parcel.createdAt.toISOString(),
      updatedAt: parcel.updatedAt.toISOString(),
      region: {
        id: parcel.region.id,
        name: parcel.region.name,
        zone: parcel.region.zone,
      },
    };
  }
}
