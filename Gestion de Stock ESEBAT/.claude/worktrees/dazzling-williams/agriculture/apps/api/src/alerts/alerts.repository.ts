import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveRules() {
    return this.prisma.alertRule.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });
  }

  async findByFingerprint(fingerprint: string) {
    return this.prisma.alert.findUnique({
      where: { fingerprint },
    });
  }

  async findLastForRuleParcel(
    ruleId: string,
    parcelId: string,
    since: Date,
  ) {
    return this.prisma.alert.findFirst({
      where: {
        ruleId,
        parcelId,
        triggeredAt: { gte: since },
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async create(data: {
    farmerUserId: string;
    parcelId: string;
    ruleId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    fingerprint: string;
    meta?: Record<string, unknown>;
  }) {
    const { meta, ...rest } = data;
    return this.prisma.alert.create({
      data: {
        ...rest,
        meta: meta as Prisma.InputJsonValue | undefined,
        triggeredAt: new Date(),
      },
    });
  }

  async createEvent(data: {
    alertId: string;
    eventType: string;
    actorUserId?: string;
  }) {
    return this.prisma.alertEvent.create({
      data: {
        alertId: data.alertId,
        eventType: data.eventType,
        actorUserId: data.actorUserId,
      },
    });
  }

  async getParcelsBatch(skip: number, take: number) {
    return this.prisma.parcel.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        farm: true,
        soilProfile: true,
      },
      orderBy: { id: 'asc' },
      skip,
      take,
    });
  }

  async getWeatherForParcels(parcelIds: string[], days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const records = await this.prisma.weatherDaily.findMany({
      where: {
        parcelId: { in: parcelIds },
        date: { gte: cutoff },
      },
    });
    return records;
  }
}
