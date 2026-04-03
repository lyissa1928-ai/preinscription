import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminStatsDTO {
  totalUsers: number;
  activeUsers: number;
  totalFarms: number;
  totalParcels: number;
  totalRegions: number;
  totalCrops: number;
  totalAlertRules: number;
  openAlerts: number;
  criticalAlerts: number;
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStatsDTO> {
    const [
      totalUsers,
      activeUsers,
      totalFarms,
      totalParcels,
      totalRegions,
      totalCrops,
      totalAlertRules,
      openAlerts,
      criticalAlerts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.farm.count(),
      this.prisma.parcel.count(),
      this.prisma.region.count({ where: { isActive: true } }),
      this.prisma.crop.count({ where: { isActive: true } }),
      this.prisma.alertRule.count({ where: { isActive: true } }),
      this.prisma.alert.count({ where: { status: 'OPEN' } }),
      this.prisma.alert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalFarms,
      totalParcels,
      totalRegions,
      totalCrops,
      totalAlertRules,
      openAlerts,
      criticalAlerts,
    };
  }
}
