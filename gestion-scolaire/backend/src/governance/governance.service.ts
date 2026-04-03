import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GovernanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getEncaissementsForDate(date: Date): Promise<number> {
    const start = this.toDateOnly(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const agg = await this.prisma.payment.aggregate({
      where: {
        statut: 'VALIDATED',
        datePaiement: { gte: start, lt: end },
      },
      _sum: { montant: true },
    });
    return agg._sum.montant ?? 0;
  }

  async getOrCreateDailyStatus(date: Date) {
    const d = this.toDateOnly(date);
    const encaissements = await this.getEncaissementsForDate(d);

    const existing = await this.prisma.dailyFinancialStatus.findUnique({
      where: { date: d },
      include: {
        validePar: true,
        breachRequests: { include: { demandeur: true, approuvePar: true } },
      },
    });

    if (existing) {
      if (existing.statut === 'DRAFT') {
        return this.prisma.dailyFinancialStatus.update({
          where: { id: existing.id },
          data: {
            totalEncaissements: encaissements,
            solde: encaissements - existing.totalDepenses,
          },
          include: {
            validePar: true,
            breachRequests: { include: { demandeur: true, approuvePar: true } },
          },
        });
      }
      return existing;
    }

    return this.prisma.dailyFinancialStatus.create({
      data: {
        date: d,
        totalEncaissements: encaissements,
        totalDepenses: 0,
        solde: encaissements,
      },
      include: {
        validePar: true,
        breachRequests: { include: { demandeur: true, approuvePar: true } },
      },
    });
  }

  async updateDailyStatus(
    date: Date,
    data: { totalDepenses?: number },
    userId: string,
  ) {
    const d = this.toDateOnly(date);
    const status = await this.prisma.dailyFinancialStatus.findUnique({
      where: { date: d },
    });
    if (!status) throw new NotFoundException('État non trouvé');
    if (status.statut !== 'DRAFT')
      throw new BadRequestException(
        'État déjà validé, modification impossible',
      );

    const totalDepenses = data.totalDepenses ?? status.totalDepenses;
    const solde = status.totalEncaissements - totalDepenses;

    return this.prisma.dailyFinancialStatus.update({
      where: { date: d },
      data: { totalDepenses, solde },
      include: { validePar: true, breachRequests: true },
    });
  }

  async validateAndTransmit(date: Date, userId: string) {
    const d = this.toDateOnly(date);
    const status = await this.prisma.dailyFinancialStatus.findUnique({
      where: { date: d },
    });
    if (!status) throw new NotFoundException('État non trouvé');
    if (status.statut !== 'DRAFT')
      throw new BadRequestException('État déjà validé');

    const updated = await this.prisma.dailyFinancialStatus.update({
      where: { date: d },
      data: { statut: 'VALIDATED', valideParId: userId, valideAt: new Date() },
      include: {
        validePar: true,
        breachRequests: { include: { demandeur: true, approuvePar: true } },
      },
    });
    await this.audit.log({
      userId,
      action: 'VALIDATION_ETAT_FINANCIER',
      entityType: 'DailyFinancialStatus',
      entityId: status.id,
      oldValue: 'DRAFT',
      newValue: 'VALIDATED',
    });
    return updated;
  }

  async createBreachRequest(
    financialStatusId: string,
    justification: string,
    userId: string,
  ) {
    const status = await this.prisma.dailyFinancialStatus.findUnique({
      where: { id: financialStatusId },
      include: { breachRequests: { where: { statut: 'PENDING' } } },
    });
    if (!status) throw new NotFoundException('État financier non trouvé');
    if (status.statut !== 'VALIDATED')
      throw new BadRequestException(
        'Demande de brèche uniquement pour un état validé',
      );
    if (status.breachRequests.length > 0)
      throw new BadRequestException('Une demande de brèche est déjà en cours');

    const [, breach] = await this.prisma.$transaction([
      this.prisma.dailyFinancialStatus.update({
        where: { id: financialStatusId },
        data: { statut: 'BREACH_REQUESTED' },
      }),
      this.prisma.breachRequest.create({
        data: { financialStatusId, justification, demandeurId: userId },
        include: { financialStatus: true, demandeur: true },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'DEMANDE_BRECHE',
      entityType: 'BreachRequest',
      entityId: breach.id,
      newValue: justification,
    });
    await this.notifications.notifyRole(
      'ADMIN',
      'BREACH_REQUEST',
      'Nouvelle demande de brèche en attente de validation',
      breach.id,
      true,
    );
    return breach;
  }

  async approveBreach(breachId: string, userId: string, commentaire?: string) {
    const breach = await this.prisma.breachRequest.findUnique({
      where: { id: breachId },
      include: { financialStatus: true },
    });
    if (!breach) throw new NotFoundException('Demande non trouvée');
    if (breach.statut !== 'PENDING')
      throw new BadRequestException('Demande déjà traitée');

    await this.prisma.$transaction([
      this.prisma.breachRequest.update({
        where: { id: breachId },
        data: {
          statut: 'APPROVED',
          approuveParId: userId,
          dateApprobation: new Date(),
          commentaire,
        },
      }),
      this.prisma.dailyFinancialStatus.update({
        where: { id: breach.financialStatusId },
        data: { statut: 'VALIDATED' },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'APPROBATION_BRECHE',
      entityType: 'BreachRequest',
      entityId: breachId,
      oldValue: 'PENDING',
      newValue: 'APPROVED',
    });

    return this.prisma.breachRequest.findUnique({
      where: { id: breachId },
      include: { financialStatus: true, demandeur: true, approuvePar: true },
    });
  }

  async rejectBreach(breachId: string, userId: string, commentaire?: string) {
    const breach = await this.prisma.breachRequest.findUnique({
      where: { id: breachId },
      include: { financialStatus: true },
    });
    if (!breach) throw new NotFoundException('Demande non trouvée');
    if (breach.statut !== 'PENDING')
      throw new BadRequestException('Demande déjà traitée');

    await this.prisma.$transaction([
      this.prisma.breachRequest.update({
        where: { id: breachId },
        data: {
          statut: 'REJECTED',
          approuveParId: userId,
          dateApprobation: new Date(),
          commentaire,
        },
      }),
      this.prisma.dailyFinancialStatus.update({
        where: { id: breach.financialStatusId },
        data: { statut: 'VALIDATED' },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'REJET_BRECHE',
      entityType: 'BreachRequest',
      entityId: breachId,
      oldValue: 'PENDING',
      newValue: 'REJECTED',
    });

    return this.prisma.breachRequest.findUnique({
      where: { id: breachId },
      include: { financialStatus: true, demandeur: true, approuvePar: true },
    });
  }

  async findFinancialStatuses(filters?: { dateDebut?: Date; dateFin?: Date }) {
    const where: { date?: { gte?: Date; lte?: Date } } = {};
    if (filters?.dateDebut || filters?.dateFin) {
      where.date = {};
      if (filters.dateDebut)
        where.date.gte = this.toDateOnly(filters.dateDebut);
      if (filters.dateFin) {
        const fin = this.toDateOnly(filters.dateFin);
        where.date.lte = new Date(fin.getTime() + 24 * 60 * 60 * 1000 - 1);
      }
    }

    return this.prisma.dailyFinancialStatus.findMany({
      where,
      include: {
        validePar: true,
        breachRequests: { include: { demandeur: true, approuvePar: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findBreachRequests(filters?: { statut?: string }) {
    const where: { statut?: string } = {};
    if (filters?.statut) where.statut = filters.statut;

    return this.prisma.breachRequest.findMany({
      where,
      include: { financialStatus: true, demandeur: true, approuvePar: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingBreaches() {
    return this.findBreachRequests({ statut: 'PENDING' });
  }

  async exportFinancialStatusesCsv(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
  }): Promise<string> {
    const statuses = await this.findFinancialStatuses(filters);
    const rows = [
      [
        'Date',
        'Encaissements (FCFA)',
        'Dépenses (FCFA)',
        'Solde (FCFA)',
        'Statut',
        'Validé par',
      ].join(';'),
      ...statuses.map((s) =>
        [
          new Date(s.date).toLocaleDateString('fr-FR'),
          s.totalEncaissements,
          s.totalDepenses,
          s.solde,
          s.statut,
          s.validePar ? `${s.validePar.firstName} ${s.validePar.lastName}` : '',
        ].join(';'),
      ),
    ];
    return '\uFEFF' + rows.join('\n');
  }

  async exportFinancialStatusesExcel(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
  }): Promise<Buffer> {
    const XLSX = require('xlsx');
    const statuses = await this.findFinancialStatuses(filters);
    const headers = [
      'Date',
      'Encaissements (FCFA)',
      'Dépenses (FCFA)',
      'Solde (FCFA)',
      'Statut',
      'Validé par',
    ];
    const rows = statuses.map((s) => [
      new Date(s.date).toLocaleDateString('fr-FR'),
      s.totalEncaissements,
      s.totalDepenses,
      s.solde,
      s.statut,
      s.validePar ? `${s.validePar.firstName} ${s.validePar.lastName}` : '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'États financiers');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
