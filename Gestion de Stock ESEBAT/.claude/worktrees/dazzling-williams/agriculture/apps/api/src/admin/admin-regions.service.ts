import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface RegionListItemDTO {
  id: string;
  name: string;
  code: string;
  zone: string;
  isActive: boolean;
}

export interface PaginatedRegions {
  items: RegionListItemDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AdminRegionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    actorId: string,
    params: {
      page: number;
      limit: number;
      q?: string;
      zone?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedRegions> {
    const { page, limit, q, zone, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (zone) where.zone = zone;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.region.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: cappedLimit,
      }),
      this.prisma.region.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        zone: r.zone,
        isActive: (r as { isActive?: boolean }).isActive ?? true,
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(actorId: string, id: string): Promise<RegionListItemDTO> {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) {
      throw new NotFoundException({
        code: 'REGION_NOT_FOUND',
        message: 'Région non trouvée',
      });
    }
    return {
      id: region.id,
      name: region.name,
      code: region.code,
      zone: region.zone,
      isActive: (region as { isActive?: boolean }).isActive ?? true,
    };
  }

  async create(
    actorId: string,
    dto: { name: string; code: string; zone: string },
  ): Promise<RegionListItemDTO> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.region.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REGION_CODE_EXISTS',
        message: 'Une région avec ce code existe déjà',
      });
    }
    const region = await this.prisma.region.create({
      data: {
        name: dto.name.trim(),
        code,
        zone: dto.zone.trim(),
      },
    });

    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'Region',
      entityId: region.id,
      after: { name: region.name, code: region.code, zone: region.zone },
    });

    return this.toListItem(region);
  }

  async update(
    actorId: string,
    id: string,
    dto: { name?: string; code?: string; zone?: string },
  ): Promise<RegionListItemDTO> {
    const before = await this.prisma.region.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'REGION_NOT_FOUND',
        message: 'Région non trouvée',
      });
    }
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const other = await this.prisma.region.findFirst({
        where: { code, NOT: { id } },
      });
      if (other) {
        throw new ConflictException({
          code: 'REGION_CODE_EXISTS',
          message: 'Une région avec ce code existe déjà',
        });
      }
    }

    const region = await this.prisma.region.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
        ...(dto.zone !== undefined && { zone: dto.zone.trim() }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Region',
      entityId: id,
      before: { name: before.name, code: before.code, zone: before.zone },
      after: { name: region.name, code: region.code, zone: region.zone },
    });

    return this.toListItem(region);
  }

  async setActive(
    actorId: string,
    id: string,
    active: boolean,
  ): Promise<RegionListItemDTO> {
    const before = await this.prisma.region.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'REGION_NOT_FOUND',
        message: 'Région non trouvée',
      });
    }
    const region = await this.prisma.region.update({
      where: { id },
      data: { isActive: active },
    });

    await this.audit.log({
      actorId,
      action: active ? 'ENABLE' : 'DISABLE',
      entity: 'Region',
      entityId: id,
      before: { isActive: (before as { isActive?: boolean }).isActive },
      after: { isActive: region.isActive },
    });

    return this.toListItem(region);
  }

  private toListItem(r: {
    id: string;
    name: string;
    code: string;
    zone: string;
    isActive?: boolean;
  }): RegionListItemDTO {
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      zone: r.zone,
      isActive: r.isActive ?? true,
    };
  }
}
