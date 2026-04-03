import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: string;
    newValue?: string;
    ip?: string;
  }) {
    const { userId, action, entityType, entityId, oldValue, newValue, ip } =
      data;
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue != null ? String(oldValue).slice(0, 2000) : null,
        newValue: newValue != null ? String(newValue).slice(0, 2000) : null,
        ip,
      },
    });
  }

  async findMany(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
    userId?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {};
      if (filters.dateDebut)
        (where.createdAt as Record<string, Date>).gte = filters.dateDebut;
      if (filters.dateFin)
        (where.createdAt as Record<string, Date>).lte = filters.dateFin;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ?? 100,
        skip: filters?.offset ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async exportCsv(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
    userId?: string;
    action?: string;
    entityType?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {};
      if (filters.dateDebut)
        (where.createdAt as Record<string, Date>).gte = filters.dateDebut;
      if (filters.dateFin)
        (where.createdAt as Record<string, Date>).lte = filters.dateFin;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header =
      'Date;Utilisateur;Action;Entité;ID;Ancienne valeur;Nouvelle valeur;IP\n';
    const rows = logs.map(
      (l) =>
        `${l.createdAt.toISOString()};${l.userId ?? ''};${l.action};${l.entityType};${l.entityId ?? ''};${(l.oldValue ?? '').replace(/;/g, ',')};${(l.newValue ?? '').replace(/;/g, ',')};${l.ip ?? ''}`,
    );
    return header + rows.join('\n');
  }

  async exportExcel(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
    userId?: string;
    action?: string;
    entityType?: string;
  }): Promise<Buffer> {
    const XLSX = require('xlsx');
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {};
      if (filters.dateDebut)
        (where.createdAt as Record<string, Date>).gte = filters.dateDebut;
      if (filters.dateFin)
        (where.createdAt as Record<string, Date>).lte = filters.dateFin;
    }
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const headers = [
      'Date',
      'Utilisateur',
      'Action',
      'Entité',
      'ID',
      'Ancienne valeur',
      'Nouvelle valeur',
      'IP',
    ];
    const rows = logs.map((l) => [
      l.createdAt.toISOString(),
      l.userId ?? '',
      l.action,
      l.entityType,
      l.entityId ?? '',
      (l.oldValue ?? '').replace(/;/g, ','),
      (l.newValue ?? '').replace(/;/g, ','),
      l.ip ?? '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Journal audit');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
