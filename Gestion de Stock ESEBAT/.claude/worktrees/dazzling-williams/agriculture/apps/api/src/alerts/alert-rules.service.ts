import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface AlertRuleListItem {
  id: string;
  scope: string;
  type: string;
  severity: string;
  isActive: boolean;
  cooldownHours: number;
  conditions: unknown;
  messageTemplate: string;
  windowDays: number | null;
  regionId: string | null;
  regionName?: string | null;
}
export interface PaginatedAlertRules {
  items: AlertRuleListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AlertRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.alertRule.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
      include: { region: true },
    });
  }

  async listAdmin(
    actorId: string,
    params: {
      page: number;
      limit: number;
      type?: string;
      severity?: string;
      scope?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedAlertRules> {
    const { page, limit, type, severity, scope, isActive } = params;
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (scope) where.scope = scope;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        where,
        orderBy: { type: 'asc' },
        include: { region: true },
        skip,
        take: cappedLimit,
      }),
      this.prisma.alertRule.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        scope: r.scope,
        type: r.type,
        severity: r.severity,
        isActive: r.isActive,
        cooldownHours: r.cooldownHours,
        conditions: r.conditions,
        messageTemplate: r.messageTemplate,
        windowDays: r.windowDays,
        regionId: r.regionId,
        regionName: (r as { region?: { name: string } }).region?.name ?? null,
      })),
      meta: {
        page,
        limit: cappedLimit,
        total,
        totalPages: Math.ceil(total / cappedLimit),
      },
    };
  }

  async getOne(id: string) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'ALERT_RULE_NOT_FOUND',
        message: 'Règle non trouvée',
      });
    }
    return rule;
  }

  async create(actorId: string, data: {
    scope?: string;
    regionId?: string | null;
    parcelId?: string | null;
    type: string;
    severity: string;
    conditions: unknown;
    windowDays?: number | null;
    cooldownHours?: number;
    messageTemplate: string;
  }) {
    const rule = await this.prisma.alertRule.create({
      data: {
        scope: data.scope ?? 'GLOBAL',
        regionId: data.regionId ?? null,
        parcelId: data.parcelId ?? null,
        type: data.type,
        severity: data.severity,
        conditions: data.conditions as object,
        windowDays: data.windowDays ?? null,
        cooldownHours: data.cooldownHours ?? 24,
        messageTemplate: data.messageTemplate,
      },
    });
    await this.audit.log({
      actorId,
      action: 'CREATE',
      entity: 'AlertRule',
      entityId: rule.id,
      after: { type: rule.type, severity: rule.severity, scope: rule.scope },
    });
    return rule;
  }

  async update(actorId: string, id: string, data: Partial<{
    scope: string;
    regionId: string | null;
    parcelId: string | null;
    type: string;
    severity: string;
    isActive: boolean;
    conditions: unknown;
    windowDays: number | null;
    cooldownHours: number;
    messageTemplate: string;
  }>) {
    const existing = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'ALERT_RULE_NOT_FOUND',
        message: 'Règle non trouvée',
      });
    }
    const rule = await this.prisma.alertRule.update({
      where: { id },
      data: data as Record<string, unknown>,
    });
    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'AlertRule',
      entityId: id,
      before: { type: existing.type, severity: existing.severity },
      after: { type: rule.type, severity: rule.severity },
    });
    return rule;
  }

  async setActive(actorId: string, id: string, isActive: boolean) {
    const existing = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'ALERT_RULE_NOT_FOUND',
        message: 'Règle non trouvée',
      });
    }
    const rule = await this.prisma.alertRule.update({
      where: { id },
      data: { isActive },
    });
    await this.audit.log({
      actorId,
      action: isActive ? 'ENABLE' : 'DISABLE',
      entity: 'AlertRule',
      entityId: id,
      before: { isActive: existing.isActive },
      after: { isActive: rule.isActive },
    });
    return rule;
  }
}
