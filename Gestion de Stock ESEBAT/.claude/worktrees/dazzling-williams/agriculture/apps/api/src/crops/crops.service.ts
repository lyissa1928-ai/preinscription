import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CropCreateInput, CropUpdateInput } from '@agriculture/shared';
import type { CropDTO } from '@agriculture/shared';

export interface CropAdminListItem extends CropDTO {
  isActive: boolean;
}
export interface PaginatedCrops {
  items: CropAdminListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class CropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<CropDTO[]> {
    const crops = await this.prisma.crop.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return crops.map((c) => this.toDTO(c));
  }

  async listAdmin(
    actorId: string,
    params: {
      page: number;
      limit: number;
      q?: string;
      category?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedCrops> {
    const { page, limit, q, category, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.crop.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: cappedLimit,
      }),
      this.prisma.crop.count({ where }),
    ]);

    return {
      items: items.map((c) => ({ ...this.toDTO(c), isActive: c.isActive })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(id: string): Promise<CropDTO> {
    const crop = await this.prisma.crop.findUnique({
      where: { id },
      include: { requirements: true },
    });
    if (!crop) {
      throw new NotFoundException({
        code: 'CROP_NOT_FOUND',
        message: 'Culture non trouvée',
      });
    }
    return this.toDTO(crop);
  }

  async create(actorId: string, input: CropCreateInput): Promise<CropDTO> {
    const existing = await this.prisma.crop.findUnique({
      where: { name: input.name.trim() },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CROP_NAME_EXISTS',
        message: 'Une culture avec ce nom existe déjà',
      });
    }
    const crop = await this.prisma.crop.create({
      data: {
        name: input.name.trim(),
        scientificName: input.scientificName?.trim() ?? null,
        category: input.category,
        description: input.description?.trim() ?? null,
        defaultPlantingMonths: input.defaultPlantingMonths ?? [],
        defaultHarvestMonths: input.defaultHarvestMonths ?? [],
      },
    });
    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'Crop',
      entityId: crop.id,
      after: { name: crop.name, category: crop.category },
    });
    return this.toDTO(crop);
  }

  async update(actorId: string, id: string, input: CropUpdateInput): Promise<CropDTO> {
    const existing = await this.prisma.crop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'CROP_NOT_FOUND',
        message: 'Culture non trouvée',
      });
    }
    if (input.name !== undefined) {
      const other = await this.prisma.crop.findFirst({
        where: { name: input.name.trim(), NOT: { id } },
      });
      if (other) {
        throw new ConflictException({
          code: 'CROP_NAME_EXISTS',
          message: 'Une culture avec ce nom existe déjà',
        });
      }
    }
    const crop = await this.prisma.crop.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.scientificName !== undefined && {
          scientificName: input.scientificName?.trim() ?? null,
        }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.description !== undefined && {
          description: input.description?.trim() ?? null,
        }),
        ...(input.defaultPlantingMonths !== undefined && {
          defaultPlantingMonths: input.defaultPlantingMonths ?? [],
        }),
        ...(input.defaultHarvestMonths !== undefined && {
          defaultHarvestMonths: input.defaultHarvestMonths ?? [],
        }),
      },
    });
    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Crop',
      entityId: id,
      before: { name: existing.name, category: existing.category },
      after: { name: crop.name, category: crop.category },
    });
    return this.toDTO(crop);
  }

  async setActive(
    actorId: string,
    id: string,
    active: boolean,
  ): Promise<CropDTO> {
    const before = await this.prisma.crop.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'CROP_NOT_FOUND',
        message: 'Culture non trouvée',
      });
    }
    const crop = await this.prisma.crop.update({
      where: { id },
      data: { isActive: active },
    });
    await this.audit.log({
      actorId,
      action: active ? 'ENABLE' : 'DISABLE',
      entity: 'Crop',
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive: crop.isActive },
    });
    return this.toDTO(crop);
  }

  private toDTO(crop: {
    id: string;
    name: string;
    scientificName: string | null;
    category: string;
    description: string | null;
  }): CropDTO {
    return {
      id: crop.id,
      name: crop.name,
      scientificName: crop.scientificName,
      category: crop.category as CropDTO['category'],
      description: crop.description,
    };
  }
}
