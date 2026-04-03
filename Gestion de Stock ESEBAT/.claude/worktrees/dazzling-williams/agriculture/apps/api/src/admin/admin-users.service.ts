import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface UserListItemDTO {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserDetailDTO extends UserListItemDTO {
  farm?: { id: string; name: string } | null;
  parcelsCount?: number;
}

export interface PaginatedUsers {
  items: UserListItemDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AdminUsersService {
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
      role?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedUsers> {
    const { page, limit, q, role, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (q) {
      where.email = { contains: q, mode: 'insensitive' };
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip,
        take: cappedLimit,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(actorId: string, id: string): Promise<UserDetailDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { farm: { select: { id: true, name: true } } },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }
    const parcelsCount = user.farm
      ? await this.prisma.parcel.count({ where: { farmId: user.farm.id } })
      : 0;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      farm: user.farm ?? null,
      parcelsCount,
    };
  }

  async create(
    actorId: string,
    dto: { email: string; password: string; role: string; isActive?: boolean },
  ): Promise<UserListItemDTO> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Cet email est déjà utilisé',
      });
    }
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: { email: user.email, role: user.role, isActive: user.isActive },
    });

    return this.toListItem(user);
  }

  async update(
    actorId: string,
    id: string,
    dto: { role?: string; isActive?: boolean; resetPassword?: string },
  ): Promise<UserListItemDTO> {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    const data: Record<string, unknown> = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.resetPassword) {
      data.passwordHash = await argon2.hash(dto.resetPassword);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      before: { role: before.role, isActive: before.isActive },
      after: { role: user.role, isActive: user.isActive },
      diff: data,
    });

    return this.toListItem(user);
  }

  async setActive(
    actorId: string,
    id: string,
    active: boolean,
  ): Promise<UserListItemDTO> {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: active },
    });

    await this.audit.log({
      actorId,
      action: active ? 'ENABLE' : 'DISABLE',
      entity: 'User',
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive: user.isActive },
    });

    return this.toListItem(user);
  }

  private toListItem(u: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }): UserListItemDTO {
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
