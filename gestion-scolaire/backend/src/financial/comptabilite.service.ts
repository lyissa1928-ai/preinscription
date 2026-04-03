import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Comptes par défaut (plan comptable simplifié)
const COMPTE_TRESORERIE = '512000';
const COMPTE_RECETTES = '706000';
const COMPTE_CHARGES = '601000';

@Injectable()
export class ComptabiliteService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Génère les écritures comptables (Débit/Crédit) pour les transactions clôturées.
   * Rôle: CHEF_COMPTABLE
   */
  async genererEcritures(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { ecritures: true },
    });
    if (!transaction) throw new NotFoundException('Transaction non trouvée');
    if (transaction.statut !== 'VALIDE') {
      throw new BadRequestException(
        'Seules les transactions validées (clôturées) peuvent générer des écritures',
      );
    }
    if (transaction.ecritures.length > 0) {
      throw new BadRequestException(
        'Des écritures existent déjà pour cette transaction',
      );
    }

    let compteDebit = COMPTE_TRESORERIE;
    let compteCredit = COMPTE_RECETTES;
    if (transaction.sens === 'DECAISSEMENT') {
      compteDebit = COMPTE_CHARGES;
      compteCredit = COMPTE_TRESORERIE;
    }

    const [compteD, compteC] = await Promise.all([
      this.prisma.compteComptable.findUnique({
        where: { numeroCompte: compteDebit },
      }),
      this.prisma.compteComptable.findUnique({
        where: { numeroCompte: compteCredit },
      }),
    ]);

    if (!compteD || !compteC) {
      throw new BadRequestException(
        'Plan comptable incomplet. Créez les comptes 512000, 706000, 601000.',
      );
    }

    const ecriture = await this.prisma.ecritureComptable.create({
      data: {
        transactionId,
        compteDebitId: compteD.id,
        compteCreditId: compteC.id,
        montant: transaction.montant,
        libelle: transaction.libelle,
      },
      include: { compteDebit: true, compteCredit: true },
    });

    await this.audit.log({
      userId,
      action: 'GENERATION_ECRITURE',
      entityType: 'EcritureComptable',
      entityId: ecriture.id,
      newValue: transaction.libelle,
    });

    return ecriture;
  }

  /**
   * Liste les transactions validées non encore rapprochées.
   */
  async getTransactionsARapprocher() {
    return this.prisma.transaction.findMany({
      where: { statut: 'VALIDE', rapproche: false },
      include: { enregistrePar: true },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Liste les transactions validées (clôturées) sans écritures.
   */
  async getTransactionsSansEcritures() {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        statut: 'VALIDE',
        ecritures: { none: {} },
      },
      include: { enregistrePar: true },
      orderBy: { date: 'desc' },
    });
    return transactions;
  }

  /**
   * Initie une demande de décaissement (comptable → DAF).
   * Rôle: CHEF_COMPTABLE
   */
  async initierDemandeDecaissement(
    data: {
      budgetId: string;
      montant: number;
      libelle: string;
      typePaiement?: string;
    },
    userId: string,
  ) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: data.budgetId },
    });
    if (!budget) throw new NotFoundException('Budget non trouvé');
    if (data.montant <= 0) throw new BadRequestException('Montant invalide');
    if (budget.montantConsomme + data.montant > budget.montantAlloue) {
      throw new BadRequestException('Montant supérieur au budget restant');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        sens: 'DECAISSEMENT',
        montant: data.montant,
        libelle: data.libelle,
        typePaiement: data.typePaiement || 'VIREMENT',
        statut: 'BROUILLARD',
        enregistreParId: userId,
      },
    });

    const demande = await this.prisma.demandeDecaissement.create({
      data: {
        transactionId: transaction.id,
        budgetId: data.budgetId,
        montant: data.montant,
        libelle: data.libelle,
        initieParId: userId,
      },
      include: { budget: true, transaction: true, initiePar: true },
    });

    await this.audit.log({
      userId,
      action: 'INITIATION_DEMANDE_DECAISSEMENT',
      entityType: 'DemandeDecaissement',
      entityId: demande.id,
      newValue: data.libelle,
    });

    return demande;
  }

  /**
   * Marque une transaction comme rapprochée (vérifiée par rapport au relevé).
   * Rôle: CHEF_COMPTABLE
   */
  async rapprochement(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) throw new NotFoundException('Transaction non trouvée');
    if (transaction.rapproche)
      throw new BadRequestException('Transaction déjà rapprochée');

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { rapproche: true, dateRapprochement: new Date() },
    });

    await this.audit.log({
      userId,
      action: 'RAPPROCHEMENT',
      entityType: 'Transaction',
      entityId: transactionId,
      newValue: 'rapproché',
    });

    return { success: true };
  }

  /**
   * Balance des comptes : solde par compte.
   * Rôle: CHEF_COMPTABLE
   */
  async getBalanceComptes(dateDebut?: Date, dateFin?: Date) {
    const dateFilter =
      dateDebut || dateFin
        ? {
            dateEcriture: {
              ...(dateDebut && { gte: dateDebut }),
              ...(dateFin && { lte: dateFin }),
            },
          }
        : undefined;

    const comptes = await this.prisma.compteComptable.findMany({
      include: {
        ecrituresDebit: { where: dateFilter },
        ecrituresCredit: { where: dateFilter },
      },
    });

    return comptes
      .map((c) => {
        const totalDebit = c.ecrituresDebit.reduce((s, e) => s + e.montant, 0);
        const totalCredit = c.ecrituresCredit.reduce(
          (s, e) => s + e.montant,
          0,
        );
        const solde =
          c.type === 'DEBIT'
            ? totalDebit - totalCredit
            : totalCredit - totalDebit;
        return {
          numeroCompte: c.numeroCompte,
          intitule: c.intitule,
          totalDebit,
          totalCredit,
          solde,
        };
      })
      .filter((b) => b.totalDebit > 0 || b.totalCredit > 0);
  }

  /**
   * Grand-Livre : détail des écritures par compte.
   * Rôle: CHEF_COMPTABLE
   */
  async getGrandLivre(compteId?: string, dateDebut?: Date, dateFin?: Date) {
    const where: Record<string, unknown> = {};
    if (compteId) {
      where.OR = [{ compteDebitId: compteId }, { compteCreditId: compteId }];
    }
    if (dateDebut || dateFin) {
      where.dateEcriture = {
        ...(dateDebut && { gte: dateDebut }),
        ...(dateFin && { lte: dateFin }),
      };
    }

    return this.prisma.ecritureComptable.findMany({
      where,
      include: {
        transaction: true,
        compteDebit: true,
        compteCredit: true,
      },
      orderBy: { dateEcriture: 'asc' },
    });
  }
}
