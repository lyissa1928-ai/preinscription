import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // FeeConfig
  async findFeeConfigs(formationId?: string, anneeUniv?: number) {
    const where: { formationId?: string; anneeUniv?: number } = {};
    if (formationId) where.formationId = formationId;
    if (anneeUniv) where.anneeUniv = anneeUniv;
    return this.prisma.feeConfig.findMany({
      where,
      include: { formation: true },
      orderBy: [{ anneeUniv: 'desc' }, { formation: { code: 'asc' } }],
    });
  }

  async upsertFeeConfig(data: {
    formationId: string;
    anneeUniv: number;
    fraisInscription?: number;
    mensualite?: number;
    nbMois?: number;
    fraisSoutenanceL3?: number;
    fraisSoutenanceM2?: number;
  }) {
    const { formationId, anneeUniv, ...rest } = data;
    return this.prisma.feeConfig.upsert({
      where: { formationId_anneeUniv: { formationId, anneeUniv } },
      create: { formationId, anneeUniv, ...rest },
      update: rest,
      include: { formation: true },
    });
  }

  // Payment
  async createPayment(
    data: {
      personId: string;
      inscriptionId: string;
      montant: number;
      type: string;
      mois?: number;
      annee?: number;
    },
    userId?: string,
  ) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id: data.inscriptionId },
      include: { person: true },
    });
    if (!inscription) throw new NotFoundException('Inscription non trouvée');
    if (inscription.personId !== data.personId)
      throw new BadRequestException('Personne incompatible');

    if (
      data.type === 'MENSUALITE' &&
      (data.mois == null || data.annee == null)
    ) {
      throw new BadRequestException('Mois et année requis pour une mensualité');
    }

    const existing =
      data.type === 'MENSUALITE'
        ? await this.prisma.payment.findFirst({
            where: {
              inscriptionId: data.inscriptionId,
              type: 'MENSUALITE',
              mois: data.mois,
              annee: data.annee,
              statut: 'VALIDATED',
            },
          })
        : null;
    if (existing)
      throw new ConflictException('Cette mensualité est déjà payée');

    const payment = await this.prisma.payment.create({
      data: {
        personId: data.personId,
        inscriptionId: data.inscriptionId,
        montant: data.montant,
        type: data.type,
        mois: data.mois,
        annee: data.annee,
      },
      include: {
        person: { include: { user: true } },
        inscription: { include: { formation: true } },
      },
    });
    await this.audit.log({
      userId,
      action: 'CREATION_PAIEMENT',
      entityType: 'Payment',
      entityId: payment.id,
      newValue: JSON.stringify({ montant: data.montant, type: data.type }),
    });
    return payment;
  }

  async findAllPayments(filters?: {
    personId?: string;
    inscriptionId?: string;
    statut?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.personId) where.personId = filters.personId;
    if (filters?.inscriptionId) where.inscriptionId = filters.inscriptionId;
    if (filters?.statut) where.statut = filters.statut;

    return this.prisma.payment.findMany({
      where,
      include: {
        person: { include: { user: true } },
        inscription: { include: { formation: true } },
        validePar: true,
      },
      orderBy: { datePaiement: 'desc' },
    });
  }

  async validatePayment(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement non trouvé');
    if (payment.statut === 'VALIDATED')
      throw new ConflictException('Paiement déjà validé');
    if (payment.statut === 'REJECTED')
      throw new BadRequestException('Paiement rejeté');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { statut: 'VALIDATED', valideParId: userId },
      include: {
        person: { include: { user: true } },
        inscription: { include: { formation: true } },
        validePar: true,
      },
    });
    await this.audit.log({
      userId,
      action: 'VALIDATION_PAIEMENT',
      entityType: 'Payment',
      entityId: id,
      oldValue: payment.statut,
      newValue: 'VALIDATED',
    });
    return updated;
  }

  async rejectPayment(id: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement non trouvé');
    const updated = await this.prisma.payment.update({
      where: { id },
      data: { statut: 'REJECTED' },
      include: {
        person: { include: { user: true } },
        inscription: { include: { formation: true } },
      },
    });
    await this.audit.log({
      userId,
      action: 'REJET_PAIEMENT',
      entityType: 'Payment',
      entityId: id,
      oldValue: payment.statut,
      newValue: 'REJECTED',
    });
    return updated;
  }

  // Statut en règle : au 10 du mois, paiements à jour
  async getStatutFinancier(personId: string, anneeUniv: number) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { personId_anneeUniv: { personId, anneeUniv } },
      include: { formation: true, semestre: true },
    });
    if (!inscription || inscription.statut === 'ANNULEE') {
      return { enRegle: false, raison: "Pas d'inscription active" };
    }

    const feeConfig = await this.prisma.feeConfig.findUnique({
      where: {
        formationId_anneeUniv: {
          formationId: inscription.formationId,
          anneeUniv,
        },
      },
    });
    if (!feeConfig) {
      return { enRegle: true, raison: 'Aucune configuration tarifaire' };
    }

    const now = new Date();
    const moisCourant = now.getMonth() + 1;
    const anneeCourant = now.getFullYear();
    const jour = now.getDate();
    const moisExigibles =
      jour >= 10 ? moisCourant : Math.max(1, moisCourant - 1);

    let totalDu = feeConfig.fraisInscription;
    const sem = inscription.semestre;
    if (inscription.formation.cycle === 'L' && sem && sem.numero >= 6)
      totalDu += feeConfig.fraisSoutenanceL3;
    if (inscription.formation.cycle === 'M' && sem && sem.numero >= 10)
      totalDu += feeConfig.fraisSoutenanceM2;
    totalDu += feeConfig.mensualite * Math.min(feeConfig.nbMois, moisExigibles);

    const payments = await this.prisma.payment.findMany({
      where: { personId, inscriptionId: inscription.id, statut: 'VALIDATED' },
    });
    const totalPaye = payments.reduce((s, p) => s + p.montant, 0);

    const enRegle = totalPaye >= totalDu;
    return {
      enRegle,
      totalDu,
      totalPaye,
      solde: totalPaye - totalDu,
      raison: enRegle ? 'En règle' : 'Paiements insuffisants',
    };
  }

  async getEtudiantsNonEnRegle(anneeUniv?: number) {
    const inscriptions = await this.prisma.inscription.findMany({
      where: {
        statut: { not: 'ANNULEE' },
        anneeUniv: anneeUniv ?? new Date().getFullYear(),
      },
      include: { person: { include: { user: true } }, formation: true },
    });
    const result: Array<{
      personId: string;
      matricule: string;
      nom: string;
      formation: string;
      statut: { enRegle: boolean; totalDu: number; totalPaye: number };
    }> = [];
    for (const ins of inscriptions) {
      const statut = await this.getStatutFinancier(ins.personId, ins.anneeUniv);
      if (!statut.enRegle) {
        result.push({
          personId: ins.personId,
          matricule: ins.person.matricule,
          nom: ins.person.user
            ? `${ins.person.user.firstName} ${ins.person.user.lastName}`
            : ins.person.matricule,
          formation: ins.formation.code,
          statut: {
            enRegle: statut.enRegle,
            totalDu: statut.totalDu ?? 0,
            totalPaye: statut.totalPaye ?? 0,
          },
        });
      }
    }
    return result;
  }

  /** Reste à recouvrer agrégé par formation et par cohorte (pour relances) */
  async getRecouvrementParFormationEtCohorte(anneeUniv?: number) {
    const an = anneeUniv ?? new Date().getFullYear();
    const nonEnRegle = await this.getEtudiantsNonEnRegle(an);
    const parFormation = new Map<
      string,
      {
        formationId: string;
        formationCode: string;
        formationNom: string;
        count: number;
        resteTotal: number;
        etudiants: Array<{
          personId: string;
          matricule: string;
          nom: string;
          reste: number;
        }>;
      }
    >();
    const parCohorte = new Map<
      string,
      {
        cohortId: string;
        cohortNom: string;
        formationCode: string;
        count: number;
        resteTotal: number;
        etudiants: Array<{
          personId: string;
          matricule: string;
          nom: string;
          reste: number;
        }>;
      }
    >();

    const inscriptions = await this.prisma.inscription.findMany({
      where: { statut: { not: 'ANNULEE' }, anneeUniv: an },
      include: {
        person: { include: { user: true } },
        formation: true,
        cohort: true,
      },
    });
    const personIdsNonEnRegle = new Set(nonEnRegle.map((e) => e.personId));
    const statuts = new Map<string, { totalDu: number; totalPaye: number }>();
    for (const e of nonEnRegle) {
      statuts.set(e.personId, e.statut);
    }

    for (const ins of inscriptions) {
      if (!personIdsNonEnRegle.has(ins.personId)) continue;
      const st = statuts.get(ins.personId);
      const reste = st ? st.totalDu - st.totalPaye : 0;
      const nom = ins.person.user
        ? `${ins.person.user.firstName} ${ins.person.user.lastName}`
        : ins.person.matricule;
      const ent = {
        personId: ins.personId,
        matricule: ins.person.matricule,
        nom,
        reste,
      };

      if (!parFormation.has(ins.formationId)) {
        parFormation.set(ins.formationId, {
          formationId: ins.formationId,
          formationCode: ins.formation.code,
          formationNom: ins.formation.nom,
          count: 0,
          resteTotal: 0,
          etudiants: [],
        });
      }
      const pf = parFormation.get(ins.formationId)!;
      pf.count += 1;
      pf.resteTotal += reste;
      pf.etudiants.push(ent);

      const cohortKey = ins.cohortId ?? `sans-cohorte-${ins.formationId}`;
      const cohortNom = ins.cohort
        ? `${ins.cohort.nom} ${ins.cohort.section || ''}`.trim()
        : 'Sans classe';
      if (!parCohorte.has(cohortKey)) {
        parCohorte.set(cohortKey, {
          cohortId: ins.cohortId ?? '',
          cohortNom,
          formationCode: ins.formation.code,
          count: 0,
          resteTotal: 0,
          etudiants: [],
        });
      }
      const pc = parCohorte.get(cohortKey)!;
      pc.count += 1;
      pc.resteTotal += reste;
      pc.etudiants.push(ent);
    }

    return {
      anneeUniv: an,
      parFormation: Array.from(parFormation.values()).sort(
        (a, b) => b.resteTotal - a.resteTotal,
      ),
      parCohorte: Array.from(parCohorte.values()).sort(
        (a, b) => b.resteTotal - a.resteTotal,
      ),
    };
  }
}
