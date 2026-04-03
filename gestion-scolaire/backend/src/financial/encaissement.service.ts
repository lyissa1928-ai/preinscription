import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EncaissementService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Enregistre un encaissement et génère un reçu avec UUID.
   * Rôle: CAISSIER
   */
  async enregistrerEncaissement(
    data: {
      montant: number;
      libelle: string;
      typePaiement: string;
      referenceExterne?: string;
    },
    userId: string,
  ) {
    if (data.montant <= 0)
      throw new BadRequestException('Le montant doit être strictement positif');

    const transaction = await this.prisma.transaction.create({
      data: {
        sens: 'ENCAISSEMENT',
        montant: data.montant,
        libelle: data.libelle,
        typePaiement: data.typePaiement || 'ESPECES',
        referenceExterne: data.referenceExterne,
        statut: 'BROUILLARD',
        enregistreParId: userId,
      },
      include: { enregistrePar: true },
    });

    const receipt = await this.prisma.transactionReceipt.create({
      data: { transactionId: transaction.id },
    });

    await this.audit.log({
      userId,
      action: 'ENREGISTREMENT_ENCAISSEMENT',
      entityType: 'Transaction',
      entityId: transaction.id,
      newValue: JSON.stringify({
        montant: data.montant,
        receiptId: receipt.id,
      }),
    });

    return {
      transaction,
      receipt: { id: receipt.id, dateGeneration: receipt.dateGeneration },
    };
  }

  /**
   * Brouillard de caisse : transactions non clôturées du jour.
   * Rôle: CAISSIER
   */
  async getBrouillardDeCaisse(date?: Date, userId?: string) {
    const d = date ? this.toDateOnly(date) : this.toDateOnly(new Date());
    const start = new Date(d.getTime());
    const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        sens: 'ENCAISSEMENT',
        date: { gte: start, lt: end },
        clotureJournaliereId: null,
        statut: { not: 'REJETE' },
      },
      include: { enregistrePar: true, receipt: true },
      orderBy: { date: 'asc' },
    });

    const total = transactions.reduce(
      (s, t) => s + (t.sens === 'ENCAISSEMENT' ? t.montant : -t.montant),
      0,
    );

    return {
      date: d.toISOString().slice(0, 10),
      transactions,
      total,
    };
  }

  /**
   * Clôture journalière : rend les transactions du jour non modifiables.
   * Rôle: CAISSIER
   */
  async clotureJournaliere(date: Date, userId: string) {
    const d = this.toDateOnly(date);
    const start = new Date(d.getTime());
    const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);

    const existingCloture = await this.prisma.clotureJournaliere.findUnique({
      where: { date: d },
    });
    if (existingCloture) {
      throw new BadRequestException('Une clôture existe déjà pour cette date');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: start, lt: end },
        clotureJournaliereId: null,
        statut: 'BROUILLARD',
      },
    });

    const cloture = await this.prisma.clotureJournaliere.create({
      data: {
        date: d,
        clotureParId: userId,
      },
    });

    await this.prisma.transaction.updateMany({
      where: { id: { in: transactions.map((t) => t.id) } },
      data: {
        statut: 'VALIDE',
        clotureJournaliereId: cloture.id,
      },
    });

    await this.audit.log({
      userId,
      action: 'CLOTURE_JOURNALIERE',
      entityType: 'ClotureJournaliere',
      entityId: cloture.id,
      newValue: `${transactions.length} transactions clôturées`,
    });

    return {
      cloture,
      nbTransactions: transactions.length,
    };
  }
}
