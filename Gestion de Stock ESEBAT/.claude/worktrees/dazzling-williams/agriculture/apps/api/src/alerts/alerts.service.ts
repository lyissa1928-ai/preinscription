import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsRepository } from './alerts.repository';
import { AlertsCronService } from './alerts.cron';
import type { AlertDTO, AlertSummaryDTO } from '@agriculture/shared';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AlertsRepository,
    private readonly cron: AlertsCronService,
  ) {}

  async list(
    farmerUserId: string,
    page: number,
    limit: number,
    status?: string,
    severity?: string,
  ): Promise<{ data: AlertDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const where: { farmerUserId: string; status?: string; severity?: string } = { farmerUserId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: { parcel: true },
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: data.map((a) => this.toDTO(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(farmerUserId: string, id: string): Promise<AlertDTO> {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { parcel: true },
    });
    if (!alert) {
      throw new NotFoundException({
        code: 'ALERT_NOT_FOUND',
        message: 'Alerte non trouvée',
      });
    }
    if (alert.farmerUserId !== farmerUserId) {
      throw new ForbiddenException({
        code: 'ALERT_OWNERSHIP_DENIED',
        message: 'Accès refusé',
      });
    }
    return this.toDTO(alert);
  }

  async summary(farmerUserId: string): Promise<AlertSummaryDTO> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        farmerUserId,
        status: { in: ['OPEN', 'MUTED'] },
        OR: [{ mutedUntil: null }, { mutedUntil: { gt: new Date() } }],
      },
    });

    const open = alerts.filter((a) => a.status === 'OPEN' || (a.status === 'MUTED' && a.mutedUntil && a.mutedUntil > new Date())).length;
    const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const warning = alerts.filter((a) => a.severity === 'WARNING').length;

    const last = await this.prisma.alert.findFirst({
      where: { farmerUserId },
      orderBy: { triggeredAt: 'desc' },
    });

    return {
      open,
      critical,
      warning,
      lastTriggeredAt: last?.triggeredAt?.toISOString() ?? null,
    };
  }

  async ack(farmerUserId: string, id: string): Promise<AlertDTO> {
    const alert = await this.ensureOwnership(farmerUserId, id);
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: 'ACKED', ackedAt: new Date() },
      include: { parcel: true },
    });
    await this.repo.createEvent({ alertId: id, eventType: 'ACKED', actorUserId: farmerUserId });
    return this.toDTO(updated);
  }

  async resolve(farmerUserId: string, id: string): Promise<AlertDTO> {
    const alert = await this.ensureOwnership(farmerUserId, id);
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
      include: { parcel: true },
    });
    await this.repo.createEvent({ alertId: id, eventType: 'RESOLVED', actorUserId: farmerUserId });
    return this.toDTO(updated);
  }

  async mute(farmerUserId: string, id: string, hours: number): Promise<AlertDTO> {
    const alert = await this.ensureOwnership(farmerUserId, id);
    const mutedUntil = new Date();
    mutedUntil.setHours(mutedUntil.getHours() + hours);
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: 'MUTED', mutedUntil },
      include: { parcel: true },
    });
    await this.repo.createEvent({ alertId: id, eventType: 'MUTED', actorUserId: farmerUserId });
    return this.toDTO(updated);
  }

  async runNow(): Promise<{ message: string }> {
    await this.cron.evaluateAlerts();
    return { message: 'Évaluation terminée' };
  }

  private async ensureOwnership(farmerUserId: string, id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException({
        code: 'ALERT_NOT_FOUND',
        message: 'Alerte non trouvée',
      });
    }
    if (alert.farmerUserId !== farmerUserId) {
      throw new ForbiddenException({
        code: 'ALERT_OWNERSHIP_DENIED',
        message: 'Accès refusé',
      });
    }
    return alert;
  }

  private toDTO(a: {
    id: string;
    farmerUserId: string;
    parcelId: string;
    ruleId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    status: string;
    triggeredAt: Date;
    ackedAt: Date | null;
    resolvedAt: Date | null;
    mutedUntil: Date | null;
    meta: unknown;
    parcel?: { name: string };
  }): AlertDTO {
    return {
      id: a.id,
      farmerUserId: a.farmerUserId,
      parcelId: a.parcelId,
      parcelName: a.parcel?.name,
      ruleId: a.ruleId,
      type: a.type as AlertDTO['type'],
      severity: a.severity as AlertDTO['severity'],
      title: a.title,
      message: a.message,
      status: a.status as AlertDTO['status'],
      triggeredAt: a.triggeredAt.toISOString(),
      ackedAt: a.ackedAt?.toISOString() ?? null,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      mutedUntil: a.mutedUntil?.toISOString() ?? null,
      meta: (a.meta as Record<string, unknown>) ?? null,
    };
  }
}
