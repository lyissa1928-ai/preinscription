import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FarmDTO } from '@agriculture/shared';
import type { FarmCreateInput, FarmUpdateInput } from '@agriculture/shared';

@Injectable()
export class FarmService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<FarmDTO | null> {
    const farm = await this.prisma.farm.findUnique({
      where: { userId },
      include: { region: true },
    });
    return farm ? this.toDTO(farm) : null;
  }

  async getOrThrow(userId: string): Promise<FarmDTO> {
    const farm = await this.findByUserId(userId);
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }
    return farm;
  }

  async create(userId: string, input: FarmCreateInput): Promise<FarmDTO> {
    const existing = await this.prisma.farm.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'FARM_ALREADY_EXISTS',
        message: 'Une exploitation existe déjà pour cet utilisateur',
      });
    }

    const farm = await this.prisma.farm.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone || null,
        regionId: input.regionId,
        totalArea: input.totalArea ?? null,
        farmingType: input.farmingType,
        description: input.description || null,
      },
      include: { region: true },
    });
    return this.toDTO(farm);
  }

  async delete(userId: string): Promise<void> {
    const farm = await this.prisma.farm.findUnique({
      where: { userId },
    });
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }
    await this.prisma.farm.delete({
      where: { id: farm.id },
    });
  }

  async update(userId: string, input: FarmUpdateInput): Promise<FarmDTO> {
    const farm = await this.prisma.farm.findUnique({
      where: { userId },
      include: { region: true },
    });
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }

    const updated = await this.prisma.farm.update({
      where: { id: farm.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.regionId !== undefined && { regionId: input.regionId }),
        ...(input.totalArea !== undefined && { totalArea: input.totalArea }),
        ...(input.farmingType !== undefined && { farmingType: input.farmingType }),
        ...(input.description !== undefined && {
          description: input.description || null,
        }),
      },
      include: { region: true },
    });
    return this.toDTO(updated);
  }

  private toDTO(farm: {
    id: string;
    userId: string;
    name: string;
    phone: string | null;
    regionId: string;
    totalArea: number | null;
    farmingType: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    region: { id: string; name: string; zone: string };
  }): FarmDTO {
    return {
      id: farm.id,
      userId: farm.userId,
      name: farm.name,
      phone: farm.phone,
      regionId: farm.regionId,
      totalArea: farm.totalArea,
      farmingType: farm.farmingType as FarmDTO['farmingType'],
      description: farm.description,
      createdAt: farm.createdAt.toISOString(),
      updatedAt: farm.updatedAt.toISOString(),
      region: { id: farm.region.id, name: farm.region.name, zone: farm.region.zone },
    };
  }
}
