import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogItemDTO {
  id: string;
  actorUserId: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogItemDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page: number;
    limit: number;
    actorId?: string;
    entity?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }): Promise<PaginatedAuditLogs> {
    const { page, limit, actorId, entity, action, from, to } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (actorId) where.actorUserId = actorId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = from;
      if (to) (where.createdAt as Record<string, Date>).lte = to;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
        include: { actor: { select: { email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        actorUserId: a.actorUserId,
        actorEmail: a.actor?.email ?? null,
        actorRole: a.actor?.role ?? null,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        metadata: (a.metadata as Record<string, unknown>) ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }
}
