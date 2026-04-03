import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DafService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Tableau de bord DAF : taux de recouvrement, solde trésorerie, écart budget vs réel.
   * Rôle: DAF
   */
  async getTableauDeBord(exercice?: number) {
    const year = exercice ?? new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    // Encaissements validés de l'année
    const encaissements = await this.prisma.transaction.findMany({
      where: {
        sens: 'ENCAISSEMENT',
        statut: 'VALIDE',
        date: { gte: start, lte: end },
      },
    });
    const totalEncaissements = encaissements.reduce((s, t) => s + t.montant, 0);

    // Décaissements validés
    const decaissements = await this.prisma.transaction.findMany({
      where: {
        sens: 'DECAISSEMENT',
        statut: 'VALIDE',
        date: { gte: start, lte: end },
      },
    });
    const totalDecaissements = decaissements.reduce((s, t) => s + t.montant, 0);

    // Solde trésorerie consolidé (encaissements - décaissements)
    const soldeTresorerie = totalEncaissements - totalDecaissements;

    // Budgets
    const budgets = await this.prisma.budget.findMany({
      where: { exercice: year },
    });
    const totalBudgetAlloue = budgets.reduce((s, b) => s + b.montantAlloue, 0);
    const totalBudgetConsomme = budgets.reduce(
      (s, b) => s + b.montantConsomme,
      0,
    );
    const ecartBudgetReel = totalBudgetAlloue - totalBudgetConsomme;

    // Taux de recouvrement (simplifié : encaissements / objectif si on avait un objectif)
    // Par défaut on utilise les encaissements vs décaissements prévus (budget)
    const tauxRecouvrement =
      totalBudgetAlloue > 0
        ? Math.min(
            100,
            Math.round((totalEncaissements / totalBudgetAlloue) * 1000) / 10,
          )
        : totalEncaissements > 0
          ? 100
          : 0;

    return {
      exercice: year,
      tauxRecouvrement,
      soldeTresorerie,
      totalEncaissements,
      totalDecaissements,
      totalBudgetAlloue,
      totalBudgetConsomme,
      ecartBudgetReel,
      ecartBudgetVsReel: totalBudgetConsomme - totalDecaissements,
    };
  }

  /**
   * Valide ou rejette une demande de décaissement.
   * Rôle: DAF
   */
  async approuverDepense(
    demandeId: string,
    decision: 'APPROUVEE' | 'REJETEE',
    userId: string,
    motifRejet?: string,
  ) {
    const demande = await this.prisma.demandeDecaissement.findUnique({
      where: { id: demandeId },
      include: { transaction: true, budget: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');
    if (demande.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    if (decision === 'REJETEE' && !motifRejet?.trim()) {
      throw new BadRequestException('Le motif de rejet est obligatoire');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.demandeDecaissement.update({
        where: { id: demandeId },
        data: {
          statut: decision,
          approuveParId: userId,
          dateDecision: new Date(),
          motifRejet: decision === 'REJETEE' ? motifRejet : null,
        },
      });

      await tx.transaction.update({
        where: { id: demande.transactionId },
        data: { statut: decision === 'APPROUVEE' ? 'VALIDE' : 'REJETE' },
      });

      if (decision === 'APPROUVEE') {
        await tx.budget.update({
          where: { id: demande.budgetId },
          data: {
            montantConsomme: { increment: demande.montant },
          },
        });
      }
    });

    await this.audit.log({
      userId,
      action:
        decision === 'APPROUVEE'
          ? 'APPROBATION_DECAISSEMENT'
          : 'REJET_DECAISSEMENT',
      entityType: 'DemandeDecaissement',
      entityId: demandeId,
      newValue: decision,
    });

    return {
      success: true,
      statut: decision,
    };
  }

  /**
   * Liste des demandes de décaissement en attente.
   */
  async getDemandesEnAttente() {
    return this.prisma.demandeDecaissement.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        transaction: true,
        budget: true,
        initiePar: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
