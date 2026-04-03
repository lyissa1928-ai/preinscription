import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

/** Client Prisma dans une transaction interactive. */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
];

@Injectable()
export class FormationsService {
  constructor(private prisma: PrismaService) {}

  private async ensureFiliereNotLocked(filiereId: string) {
    const f = await this.prisma.filiere.findUnique({
      where: { id: filiereId },
    });
    if (f?.verrouille)
      throw new ConflictException('Cette filière est verrouillée');
  }

  private async ensureFormationNotLocked(formationId: string) {
    const f = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: { filiere: true },
    });
    if (!f) return;
    if (f.verrouille)
      throw new ConflictException('Cette formation est verrouillée');
    if (f.filiere?.verrouille)
      throw new ConflictException('La filière parente est verrouillée');
  }

  private async ensureSemestreNotLocked(semestreId: string) {
    const s = await this.prisma.semestre.findUnique({
      where: { id: semestreId },
      include: { formation: { include: { filiere: true } } },
    });
    if (!s) return;
    if (s.verrouille) throw new ConflictException('Ce semestre est verrouillé');
    if (s.formation?.verrouille)
      throw new ConflictException('La formation parente est verrouillée');
    if (s.formation?.filiere?.verrouille)
      throw new ConflictException('La filière parente est verrouillée');
  }

  // Formations
  async findAllFormations(filiereId?: string, includePending = false) {
    const where: Record<string, unknown> = filiereId ? { filiereId } : {};
    if (!includePending) where.statut = 'APPROVED';
    return this.prisma.formation.findMany({
      where,
      include: {
        filiere: { select: { id: true, code: true, nom: true } },
        semestres: {
          orderBy: { numero: 'asc' },
          include: { maquettes: { orderBy: { anneeRef: 'desc' } } },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findFormation(id: string) {
    const f = await this.prisma.formation.findUnique({
      where: { id },
      include: {
        filiere: {
          select: { id: true, code: true, nom: true, verrouille: true },
        },
        cohorts: {
          orderBy: [{ annee: 'desc' }, { nom: 'asc' }, { section: 'asc' }],
          include: {
            campus: { select: { id: true, code: true, nom: true } },
            _count: { select: { inscriptions: true } },
          },
        },
        semestres: {
          orderBy: { numero: 'asc' },
          include: {
            maquettes: {
              orderBy: { anneeRef: 'desc' },
              include: {
                semestre: {
                  select: { id: true, numero: true, verrouille: true },
                },
                ues: { include: { ecs: true } },
              },
            },
          },
        },
      },
    });
    if (!f) throw new NotFoundException('Formation non trouvée');
    return f;
  }

  async createFormation(
    data: {
      code: string;
      nom: string;
      cycle: string;
      dureeSemestres: number;
      filiereId: string;
    },
    ctx?: { userId: string; role: string },
  ) {
    await this.ensureFiliereNotLocked(data.filiereId);
    const exists = await this.prisma.formation.findFirst({
      where: { filiereId: data.filiereId, code: data.code },
    });
    if (exists)
      throw new ConflictException(
        `Le code ${data.code} existe déjà dans cette filière`,
      );
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    return this.prisma.formation.create({
      data: {
        ...data,
        statut: isAdmin ? 'APPROVED' : 'PENDING',
        demandeurId: !isAdmin ? ctx?.userId : undefined,
      },
      include: { filiere: true, semestres: true },
    });
  }

  async updateFormation(
    id: string,
    data: Partial<{
      code: string;
      nom: string;
      cycle: string;
      dureeSemestres: number;
      /** Code cycle admission (BT1, L2, …) pour la préinscription — optionnel. */
      admissionCycleCode: string | null;
    }>,
  ) {
    const f = await this.prisma.formation.findUnique({ where: { id } });
    if (f) await this.ensureFormationNotLocked(id);
    if (f?.structureManaged) {
      const touches =
        (data.code !== undefined && data.code !== f.code) ||
        (data.nom !== undefined && data.nom !== f.nom) ||
        (data.cycle !== undefined && data.cycle !== f.cycle) ||
        (data.dureeSemestres !== undefined &&
          data.dureeSemestres !== f.dureeSemestres);
      if (touches) {
        throw new ForbiddenException(
          'Cette formation a une structure normalisée (Licence/Master) : le code, le nom, le cycle et la durée ne sont pas modifiables manuellement.',
        );
      }
    }
    if (data.code) {
      const current = await this.prisma.formation.findUnique({ where: { id } });
      if (current && data.code !== current.code) {
        const exists = await this.prisma.formation.findFirst({
          where: { filiereId: current.filiereId, code: data.code },
        });
        if (exists)
          throw new ConflictException(
            `Le code ${data.code} existe déjà dans cette filière`,
          );
      }
    }
    return this.prisma.formation.update({
      where: { id },
      data,
      include: { filiere: true, semestres: true },
    });
  }

  async deleteFormation(id: string) {
    const f = await this.prisma.formation.findUnique({ where: { id } });
    if (f) await this.ensureFormationNotLocked(id);
    return this.prisma.formation.delete({ where: { id } });
  }

  // Semestres (Formation → Semestre)
  async createSemestre(
    formationId: string,
    data: { numero: number },
    ctx?: { userId: string; role: string },
  ) {
    await this.ensureFormationNotLocked(formationId);
    const form = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });
    if (form?.structureManaged) {
      throw new ForbiddenException(
        'Les semestres sont créés automatiquement (Semestre 1 et 2) pour les formations Licence/Master. Ajout manuel interdit.',
      );
    }
    const exists = await this.prisma.semestre.findFirst({
      where: { formationId, numero: data.numero },
    });
    if (exists)
      throw new ConflictException(`Le semestre ${data.numero} existe déjà`);
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    return this.prisma.semestre.create({
      data: {
        ...data,
        formationId,
        statut: isAdmin ? 'APPROVED' : 'PENDING',
        demandeurId: !isAdmin ? ctx?.userId : undefined,
      },
    });
  }

  async updateSemestre(id: string, data: Partial<{ numero: number }>) {
    const s = await this.prisma.semestre.findUnique({
      where: { id },
      include: { formation: { select: { structureManaged: true } } },
    });
    if (s) await this.ensureSemestreNotLocked(id);
    if (s?.formation.structureManaged && data.numero !== undefined) {
      throw new ForbiddenException(
        'Impossible de modifier le numéro de semestre d’une formation à structure automatique.',
      );
    }
    return this.prisma.semestre.update({ where: { id }, data });
  }

  async deleteSemestre(id: string) {
    const s = await this.prisma.semestre.findUnique({
      where: { id },
      include: { formation: { select: { structureManaged: true } } },
    });
    if (s) await this.ensureSemestreNotLocked(id);
    if (s?.formation.structureManaged) {
      throw new ForbiddenException(
        'Les semestres d’une formation Licence/Master générée automatiquement ne peuvent pas être supprimés manuellement.',
      );
    }
    return this.prisma.semestre.delete({ where: { id } });
  }

  // Maquettes (Semestre → Maquette)
  async createMaquette(
    semestreId: string,
    data: { code: string; anneeRef: number; statut?: string },
    ctx?: { userId: string; role: string },
  ) {
    await this.ensureSemestreNotLocked(semestreId);
    const exists = await this.prisma.maquette.findFirst({
      where: { semestreId, anneeRef: data.anneeRef },
    });
    if (exists)
      throw new ConflictException(
        `Une maquette existe déjà pour ce semestre (${data.anneeRef})`,
      );
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    const statutMaquette =
      data.statut === 'archivee' || data.statut === 'archivée'
        ? 'archivee'
        : 'active';
    return this.prisma.maquette.create({
      data: {
        code: data.code,
        anneeRef: data.anneeRef,
        semestreId,
        statut: statutMaquette,
        statutValidation: isAdmin ? 'APPROVED' : 'PENDING',
        demandeurId: !isAdmin ? ctx?.userId : undefined,
      },
      include: { ues: true },
    });
  }

  async updateMaquette(
    id: string,
    data: Partial<{
      code: string;
      anneeRef: number;
      statut: string;
      verrouille: boolean;
    }>,
  ) {
    const { verrouille, ...rest } = data;
    if (Object.keys(rest).length > 0) await this.ensureMaquetteNotLocked(id);
    return this.prisma.maquette.update({ where: { id }, data });
  }

  async toggleMaquetteVerrouille(id: string) {
    const m = await this.prisma.maquette.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Maquette non trouvée');
    return this.prisma.maquette.update({
      where: { id },
      data: { verrouille: !m.verrouille },
    });
  }

  private async ensureMaquetteNotLocked(maquetteId: string) {
    const m = await this.prisma.maquette.findUnique({
      where: { id: maquetteId },
      include: {
        semestre: { include: { formation: { include: { filiere: true } } } },
      },
    });
    if (!m) return;
    if (m.verrouille)
      throw new ConflictException(
        'Cette maquette est verrouillée et ne peut pas être modifiée',
      );
    if (m.semestre?.verrouille)
      throw new ConflictException('Le semestre parent est verrouillé');
    if (m.semestre?.formation?.verrouille)
      throw new ConflictException('La formation parente est verrouillée');
    if (m.semestre?.formation?.filiere?.verrouille)
      throw new ConflictException('La filière parente est verrouillée');
  }

  async deleteMaquette(id: string) {
    const m = await this.prisma.maquette.findUnique({
      where: { id },
      include: {
        semestre: { include: { formation: { include: { filiere: true } } } },
      },
    });
    if (m) await this.ensureMaquetteNotLocked(id);
    return this.prisma.maquette.delete({ where: { id } });
  }

  // UE (Maquette → UE)
  async createUE(
    maquetteId: string,
    data: {
      code: string;
      nom: string;
      coefficient?: number;
      creditsEcts?: number;
    },
    ctx?: { userId: string; role: string },
  ) {
    await this.ensureMaquetteNotLocked(maquetteId);
    const exists = await this.prisma.uE.findFirst({
      where: { maquetteId, code: data.code },
    });
    if (exists)
      throw new ConflictException(`Le code UE ${data.code} existe déjà`);
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    return this.prisma.uE.create({
      data: {
        ...data,
        maquetteId,
        statutValidation: isAdmin ? 'APPROVED' : 'PENDING',
        demandeurId: !isAdmin ? ctx?.userId : undefined,
      },
    });
  }

  async updateUE(
    id: string,
    data: Partial<{
      code: string;
      nom: string;
      coefficient: number;
      creditsEcts: number;
    }>,
  ) {
    const ue = await this.prisma.uE.findUnique({
      where: { id },
      include: { maquette: true },
    });
    if (!ue) throw new NotFoundException('UE non trouvée');
    await this.ensureMaquetteNotLocked(ue.maquetteId);
    return this.prisma.uE.update({ where: { id }, data });
  }

  async deleteUE(id: string) {
    const ue = await this.prisma.uE.findUnique({ where: { id } });
    if (!ue) throw new NotFoundException('UE non trouvée');
    await this.ensureMaquetteNotLocked(ue.maquetteId);
    return this.prisma.uE.delete({ where: { id } });
  }

  // EC (UE → EC)
  async createEC(
    ueId: string,
    data: {
      code: string;
      nom: string;
      vhCm?: number;
      vhTd?: number;
      vhTp?: number;
      vhTpe?: number;
      coefficient?: number;
      creditsEcts?: number;
    },
  ) {
    const ue = await this.prisma.uE.findUnique({ where: { id: ueId } });
    if (ue) await this.ensureMaquetteNotLocked(ue.maquetteId);
    const exists = await this.prisma.eC.findFirst({
      where: { ueId, code: data.code },
    });
    if (exists)
      throw new ConflictException(`Le code EC ${data.code} existe déjà`);
    return this.prisma.eC.create({ data: { ...data, ueId } });
  }

  async updateEC(
    id: string,
    data: Partial<{
      code: string;
      nom: string;
      vhCm: number;
      vhTd: number;
      vhTp: number;
      vhTpe: number;
      coefficient: number;
      creditsEcts: number;
    }>,
  ) {
    const ec = await this.prisma.eC.findUnique({
      where: { id },
      include: { ue: true },
    });
    if (!ec) throw new NotFoundException('EC non trouvé');
    await this.ensureMaquetteNotLocked(ec.ue.maquetteId);
    return this.prisma.eC.update({ where: { id }, data });
  }

  async deleteEC(id: string) {
    const ec = await this.prisma.eC.findUnique({
      where: { id },
      include: { ue: true },
    });
    if (!ec) throw new NotFoundException('EC non trouvé');
    await this.ensureMaquetteNotLocked(ec.ue.maquetteId);
    return this.prisma.eC.delete({ where: { id } });
  }

  async toggleFormationVerrouille(id: string) {
    const f = await this.prisma.formation.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Formation non trouvée');
    return this.prisma.formation.update({
      where: { id },
      data: { verrouille: !f.verrouille },
    });
  }

  async toggleSemestreVerrouille(id: string) {
    const s = await this.prisma.semestre.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Semestre non trouvé');
    return this.prisma.semestre.update({
      where: { id },
      data: { verrouille: !s.verrouille },
    });
  }

  /**
   * Génère Licence 1–3 ou Master 1–2 avec nomenclature « [Niveau] [Filière] », 2 semestres et une maquette par semestre (année courante).
   */
  async addDiplomaStructureToFiliere(
    filiereId: string,
    diplomaType: 'LICENCE' | 'MASTER',
    ctx?: { userId: string; role: string },
  ) {
    await this.ensureFiliereNotLocked(filiereId);
    const filiere = await this.prisma.filiere.findUnique({
      where: { id: filiereId },
    });
    if (!filiere) throw new NotFoundException('Filière introuvable');

    const suffix = this.sanitizeFiliereCodeSuffix(filiere.code);
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    const statut = isAdmin ? 'APPROVED' : 'PENDING';
    const statutMaquette = isAdmin ? 'APPROVED' : 'PENDING';

    const levels = diplomaType === 'LICENCE' ? [1, 2, 3] : [1, 2];
    const prefix = diplomaType === 'LICENCE' ? 'L' : 'M';
    const label = diplomaType === 'LICENCE' ? 'Licence' : 'Master';
    const cycle = diplomaType === 'LICENCE' ? 'L' : 'M';
    const anneeRef = new Date().getFullYear();

    for (const n of levels) {
      const code = `${prefix}${n}-${suffix}`;
      const existing = await this.prisma.formation.findFirst({
        where: { filiereId, code },
      });
      if (existing) {
        throw new ConflictException(
          `Le parcours ${diplomaType} existe déjà ou est incomplet (formation « ${code} » présente). Supprimez les niveaux concernés avant de régénérer.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      for (const n of levels) {
        const code = `${prefix}${n}-${suffix}`;
        const nom = `${label} ${n} ${filiere.nom}`;
        const formation = await tx.formation.create({
          data: {
            code,
            nom,
            cycle,
            filiereId,
            dureeSemestres: 2,
            structureManaged: true,
            statut,
            demandeurId: !isAdmin ? ctx?.userId : undefined,
          },
        });
        for (const numero of [1, 2] as const) {
          const semestre = await tx.semestre.create({
            data: {
              formationId: formation.id,
              numero,
              statut,
              demandeurId: !isAdmin ? ctx?.userId : undefined,
            },
          });
          await tx.maquette.create({
            data: {
              semestreId: semestre.id,
              code: `S${numero}-${anneeRef}`,
              anneeRef,
              statut: 'active',
              statutValidation: statutMaquette,
              demandeurId: !isAdmin ? ctx?.userId : undefined,
            },
          });
        }
      }
    });

    return this.prisma.filiere.findUnique({
      where: { id: filiereId },
      include: {
        formations: {
          orderBy: { code: 'asc' },
          include: {
            semestres: {
              orderBy: { numero: 'asc' },
              include: { maquettes: { orderBy: { anneeRef: 'desc' } } },
            },
          },
        },
      },
    });
  }

  /** Suffixe stable pour codes formation (L1-XXX, M2-XXX). */
  private sanitizeFiliereCodeSuffix(code: string): string {
    const s = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return s.length > 0 ? s : 'FIL';
  }

  // Hiérarchie complète (par filière)
  async getHierarchy(includePending = false) {
    const where = includePending ? {} : { statut: 'APPROVED' };
    const formationWhere = includePending ? {} : { statut: 'APPROVED' };
    const semestreWhere = includePending ? {} : { statut: 'APPROVED' };
    const maquetteWhere = includePending
      ? {}
      : { statutValidation: 'APPROVED' };
    const ueWhere = includePending ? {} : { statutValidation: 'APPROVED' };
    return this.prisma.filiere.findMany({
      where,
      include: {
        formations: {
          where: formationWhere,
          include: {
            semestres: {
              where: semestreWhere,
              orderBy: { numero: 'asc' },
              include: {
                maquettes: {
                  where: maquetteWhere,
                  orderBy: { anneeRef: 'desc' },
                  include: {
                    ues: {
                      where: ueWhere,
                      include: { ecs: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }
}
