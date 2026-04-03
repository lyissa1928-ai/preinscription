import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InscriptionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Incrémente le suffixe alphabétique de section (ex: "" → "A", "A" → "B", "Z" → "AA"). */
  private nextSectionLetter(section: string): string {
    const s = section.trim();
    if (!s) return 'A';
    if (s.length === 1) {
      if (s === 'Z') return 'AA';
      return String.fromCharCode(s.charCodeAt(0) + 1);
    }
    const last = s.slice(-1);
    if (last !== 'Z')
      return s.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
    return s + 'A';
  }

  /** Si la classe est pleine, crée (ou récupère) la section suivante avec les mêmes paramètres ; sinon retourne la classe telle quelle. */
  private async getOrCreateNextSectionCohort(fullCohort: {
    id: string;
    nom: string;
    section: string;
    formationId: string;
    campusId: string | null;
    annee: number;
    effectifMax: number | null;
  }) {
    if (fullCohort.effectifMax == null) return fullCohort;
    const nextSection = this.nextSectionLetter(fullCohort.section);
    const existing = await this.prisma.cohort.findFirst({
      where: {
        formationId: fullCohort.formationId,
        annee: fullCohort.annee,
        nom: fullCohort.nom,
        section: nextSection,
      },
      include: { formation: true, campus: true },
    });
    if (existing) return existing;
    return this.prisma.cohort.create({
      data: {
        nom: fullCohort.nom,
        section: nextSection,
        formationId: fullCohort.formationId,
        campusId: fullCohort.campusId,
        annee: fullCohort.annee,
        effectifMax: fullCohort.effectifMax,
      },
      include: { formation: true, campus: true },
    });
  }

  async createCohort(data: {
    nom: string;
    section?: string;
    formationId: string;
    campusId?: string | null;
    annee: number;
    effectifMax?: number;
    responsableTeacherId?: string | null;
  }) {
    const effectifMax = data.effectifMax;
    if (
      effectifMax == null ||
      typeof effectifMax !== 'number' ||
      effectifMax < 1
    ) {
      throw new BadRequestException(
        "L'effectif maximum est obligatoire et doit être au moins 1.",
      );
    }
    const section = data.section?.trim() ?? '';
    const exists = await this.prisma.cohort.findFirst({
      where: {
        formationId: data.formationId,
        annee: data.annee,
        nom: data.nom,
        section,
      },
    });
    if (exists) throw new ConflictException('Cette classe existe déjà');
    return this.prisma.cohort.create({
      data: {
        nom: data.nom,
        section,
        formationId: data.formationId,
        campusId: data.campusId ?? undefined,
        annee: data.annee,
        effectifMax: effectifMax ?? undefined,
        responsableTeacherId: data.responsableTeacherId ?? undefined,
      },
      include: this.cohortInclude(),
    });
  }

  private cohortInclude() {
    return {
      formation: true,
      campus: true,
      responsable: {
        include: {
          person: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    };
  }

  async findCohorts(formationId?: string, annee?: number, campusId?: string) {
    const where: {
      formationId?: string;
      annee?: number;
      campusId?: string | null;
    } = {};
    if (formationId) where.formationId = formationId;
    if (annee) where.annee = annee;
    if (campusId !== undefined) where.campusId = campusId || null;
    return this.prisma.cohort.findMany({
      where,
      include: this.cohortInclude(),
      orderBy: [{ annee: 'desc' }, { nom: 'asc' }, { section: 'asc' }],
    });
  }

  async updateCohort(
    id: string,
    data: {
      nom?: string;
      section?: string;
      formationId?: string;
      campusId?: string | null;
      annee?: number;
      effectifMax?: number;
      responsableTeacherId?: string | null;
    },
  ) {
    const existing = await this.prisma.cohort.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Classe non trouvée');
    const section =
      data.section !== undefined
        ? (data.section?.trim() ?? '')
        : existing.section;
    const nom = data.nom ?? existing.nom;
    const formationId = data.formationId ?? existing.formationId;
    const campusId =
      data.campusId !== undefined ? data.campusId || null : existing.campusId;
    const annee = data.annee ?? existing.annee;
    const responsableTeacherId =
      data.responsableTeacherId !== undefined
        ? data.responsableTeacherId || null
        : existing.responsableTeacherId;
    const effectifMax =
      data.effectifMax !== undefined ? data.effectifMax : existing.effectifMax;
    if (
      effectifMax != null &&
      (typeof effectifMax !== 'number' || effectifMax < 1)
    ) {
      throw new BadRequestException("L'effectif maximum doit être au moins 1.");
    }
    const conflict = await this.prisma.cohort.findFirst({
      where: { formationId, annee, nom, section, id: { not: id } },
    });
    if (conflict)
      throw new ConflictException(
        'Une classe avec ces caractéristiques existe déjà',
      );
    return this.prisma.cohort.update({
      where: { id },
      data: {
        nom,
        section,
        formationId,
        campusId,
        annee,
        effectifMax: effectifMax ?? undefined,
        responsableTeacherId,
      },
      include: this.cohortInclude(),
    });
  }

  async deleteCohort(id: string) {
    const c = await this.prisma.cohort.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Classe non trouvée');
    return this.prisma.cohort.delete({
      where: { id },
      include: this.cohortInclude(),
    });
  }

  async bulkCreateCohorts(
    items: Array<{
      formationCode: string;
      annee: number;
      nom: string;
      section?: string;
      effectifMax?: number;
      campusCode?: string;
    }>,
  ) {
    const formations = await this.prisma.formation.findMany({
      where: { code: { in: [...new Set(items.map((i) => i.formationCode))] } },
    });
    const byCode = new Map(formations.map((f) => [f.code, f]));
    const campusCodes = [
      ...new Set(items.map((i) => i.campusCode).filter(Boolean)),
    ] as string[];
    const campuses = campusCodes.length
      ? await this.prisma.campus.findMany({
          where: { code: { in: campusCodes } },
        })
      : [];
    const campusByCode = new Map(campuses.map((c) => [c.code, c.id]));
    const created: unknown[] = [];
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const formation = byCode.get(it.formationCode);
      if (!formation) {
        errors.push(
          `Ligne ${i + 2}: formation "${it.formationCode}" introuvable`,
        );
        continue;
      }
      const section = it.section?.trim() ?? '';
      const effectifMax =
        it.effectifMax != null && it.effectifMax >= 1 ? it.effectifMax : 30;
      const campusId = it.campusCode
        ? (campusByCode.get(it.campusCode) ?? undefined)
        : undefined;
      try {
        const cohort = await this.prisma.cohort.create({
          data: {
            nom: it.nom,
            section,
            formationId: (formation as { id: string }).id,
            annee: it.annee,
            effectifMax,
            campusId,
          },
          include: { formation: true, campus: true },
        });
        created.push(cohort);
      } catch {
        errors.push(
          `Ligne ${i + 2}: doublon ou erreur (${it.formationCode} / ${it.annee} / ${it.nom} / ${section})`,
        );
      }
    }
    return { created: created.length, errors };
  }

  async bulkUpdateCohorts(
    items: Array<{
      id: string;
      nom?: string;
      section?: string;
      formationId?: string;
      annee?: number;
    }>,
  ) {
    const results: { updated: number; errors: string[] } = {
      updated: 0,
      errors: [],
    };
    for (let i = 0; i < items.length; i++) {
      try {
        await this.updateCohort(items[i].id, items[i]);
        results.updated++;
      } catch (e) {
        results.errors.push(
          `Ligne ${i + 1}: ${e instanceof Error ? e.message : 'Erreur'}`,
        );
      }
    }
    return results;
  }

  async bulkDeleteCohorts(ids: string[]) {
    const deleted = await this.prisma.cohort.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: deleted.count };
  }

  getCohortsTemplateExcel(): Buffer {
    const XLSX = require('xlsx');
    const headers = ['formationCode', 'annee', 'nom', 'section'];
    const rows = [headers, ['L1-GC', 2024, 'L1 Génie Civil', 'A']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Classes');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async createInscription(data: {
    personId: string;
    formationId: string;
    maquetteId: string;
    semestreId: string;
    cohortId?: string;
    campusId?: string | null;
    anneeUniv: number;
    statut?: 'PROVISOIRE' | 'INSCRIT' | 'CONFIRMEE' | 'VALIDE' | 'ANNULEE';
  }) {
    const person = await this.prisma.person.findUnique({
      where: { id: data.personId },
      include: { student: true },
    });
    if (!person) throw new NotFoundException('Personne non trouvée');
    if (person.type !== 'STUDENT')
      throw new BadRequestException(
        'Seuls les étudiants peuvent être inscrits',
      );

    const existing = await this.prisma.inscription.findUnique({
      where: {
        personId_anneeUniv: {
          personId: data.personId,
          anneeUniv: data.anneeUniv,
        },
      },
    });
    if (existing)
      throw new ConflictException(
        'Cet étudiant a déjà une inscription pour cette année',
      );

    let cohortIdToUse = data.cohortId;
    let campusIdToUse = data.campusId ?? null;
    if (data.cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: data.cohortId },
      });
      if (!cohort) throw new NotFoundException('Classe non trouvée');
      if (campusIdToUse == null) campusIdToUse = cohort.campusId;
      const count = await this.prisma.inscription.count({
        where: {
          cohortId: data.cohortId,
          statut: { not: 'ANNULEE' },
        },
      });
      if (cohort.effectifMax != null && count >= cohort.effectifMax) {
        const cohortWithRoom = await this.getOrCreateNextSectionCohort(cohort);
        cohortIdToUse = cohortWithRoom.id;
      }
    }

    const maquette = await this.prisma.maquette.findUnique({
      where: { id: data.maquetteId },
      include: { semestre: { include: { formation: true } } },
    });
    if (!maquette) throw new NotFoundException('Maquette non trouvée');
    if (maquette.semestre.formationId !== data.formationId)
      throw new BadRequestException('Maquette incompatible avec la formation');
    if (maquette.semestreId !== data.semestreId)
      throw new BadRequestException('Semestre incompatible avec la maquette');
    if (maquette.anneeRef !== data.anneeUniv)
      throw new BadRequestException(
        'Année universitaire incompatible avec la maquette',
      );

    const semestre = await this.prisma.semestre.findUnique({
      where: { id: data.semestreId },
    });
    if (!semestre) throw new NotFoundException('Semestre non trouvé');

    const statutToUse:
      | 'PROVISOIRE'
      | 'INSCRIT'
      | 'CONFIRMEE'
      | 'VALIDE'
      | 'ANNULEE' =
      data.statut ??
      (person.student?.statutInscription === 'valide'
        ? 'INSCRIT'
        : 'PROVISOIRE');

    return this.prisma.inscription.create({
      data: {
        personId: data.personId,
        formationId: data.formationId,
        maquetteId: data.maquetteId,
        semestreId: data.semestreId,
        cohortId: cohortIdToUse,
        campusId: campusIdToUse,
        anneeUniv: data.anneeUniv,
        statut: statutToUse,
      },
      include: {
        person: { include: { user: true } },
        formation: true,
        maquette: true,
        semestre: true,
        cohort: true,
        campus: true,
      },
    });
  }

  async findAll(filters?: {
    formationId?: string;
    cohortId?: string;
    anneeUniv?: number;
    statut?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.formationId) where.formationId = filters.formationId;
    if (filters?.cohortId) where.cohortId = filters.cohortId;
    if (filters?.anneeUniv) where.anneeUniv = filters.anneeUniv;
    if (filters?.statut) where.statut = filters.statut;

    return this.prisma.inscription.findMany({
      where,
      include: {
        person: { include: { user: true, student: true } },
        formation: true,
        maquette: true,
        semestre: true,
        cohort: true,
      },
      orderBy: [{ anneeUniv: 'desc' }, { person: { matricule: 'asc' } }],
    });
  }

  async findByPerson(personId: string) {
    return this.prisma.inscription.findMany({
      where: { personId },
      include: {
        formation: true,
        maquette: true,
        semestre: true,
        cohort: true,
      },
      orderBy: { anneeUniv: 'desc' },
    });
  }

  async updateStatut(
    id: string,
    statut: 'INSCRIT' | 'VALIDE' | 'PROVISOIRE' | 'CONFIRMEE' | 'ANNULEE',
    userId?: string,
  ) {
    const existing = await this.prisma.inscription.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Inscription non trouvée');

    const updated = await this.prisma.inscription.update({
      where: { id },
      data: { statut },
      include: {
        person: { include: { user: true, student: true } },
        formation: true,
        maquette: true,
        semestre: true,
        cohort: true,
      },
    });
    await this.audit.log({
      userId,
      action: 'CHANGEMENT_STATUT_INSCRIPTION',
      entityType: 'Inscription',
      entityId: id,
      oldValue: existing.statut,
      newValue: statut,
    });
    return updated;
  }

  /** Module Transfert : clôture de la liste (INSCRIT/CONFIRMEE → VALIDE) pour une année et optionnellement une formation */
  async closeInscriptions(
    anneeUniv: number,
    formationId?: string,
    userId?: string,
  ) {
    const whereBase = formationId ? { anneeUniv, formationId } : { anneeUniv };
    const r1 = await this.prisma.inscription.updateMany({
      where: { ...whereBase, statut: 'INSCRIT' },
      data: { statut: 'VALIDE' },
    });
    const r2 = await this.prisma.inscription.updateMany({
      where: { ...whereBase, statut: 'CONFIRMEE' },
      data: { statut: 'VALIDE' },
    });
    await this.audit.log({
      userId,
      action: 'CLOTURE_INSCRIPTIONS',
      entityType: 'Inscription',
      entityId: '',
      oldValue: 'INSCRIT',
      newValue: 'VALIDE',
    });
    return { updated: r1.count + r2.count };
  }

  /** Module Pédagogie : import groupé – assigner des inscriptions (validées) à une classe ; création auto de sections si effectif max atteint. */
  async bulkAssignToCohort(
    data: {
      cohortId: string;
      inscriptionIds?: string[];
      numeroCartes?: string[];
    },
    userId?: string,
  ) {
    let currentCohort = await this.prisma.cohort.findUnique({
      where: { id: data.cohortId },
      include: { formation: true },
    });
    if (!currentCohort) throw new NotFoundException('Classe non trouvée');

    let ids: string[] = data.inscriptionIds ?? [];
    if (data.numeroCartes?.length) {
      const students = await this.prisma.student.findMany({
        where: { numeroCarteEtudiant: { in: data.numeroCartes } },
        select: { personId: true },
      });
      const personIds = students.map((s) => s.personId);
      const ins = await this.prisma.inscription.findMany({
        where: {
          personId: { in: personIds },
          formationId: currentCohort.formationId,
          statut: 'VALIDE',
        },
        select: { id: true },
      });
      ids = [...new Set([...ids, ...ins.map((i) => i.id)])];
    }
    if (ids.length === 0) return { updated: 0 };

    let updated = 0;
    for (const insId of ids) {
      const count = await this.prisma.inscription.count({
        where: {
          cohortId: currentCohort.id,
          statut: { not: 'ANNULEE' },
        },
      });
      if (
        currentCohort.effectifMax != null &&
        count >= currentCohort.effectifMax
      ) {
        currentCohort = await this.getOrCreateNextSectionCohort(currentCohort);
      }
      const r = await this.prisma.inscription.updateMany({
        where: {
          id: insId,
          formationId: currentCohort.formationId,
          statut: 'VALIDE',
        },
        data: { cohortId: currentCohort.id },
      });
      updated += r.count;
    }
    await this.audit.log({
      userId,
      action: 'BULK_ASSIGN_COHORT',
      entityType: 'Inscription',
      entityId: data.cohortId,
      oldValue: '',
      newValue: String(updated),
    });
    return { updated };
  }

  async annuler(id: string, userId?: string) {
    return this.updateStatut(id, 'ANNULEE', userId);
  }

  /** Effectif max par défaut lors de la création automatique de la première cohorte (formation + année). */
  private static readonly DEFAULT_EFFECTIF_MAX = 50;

  /**
   * Affecte une inscription (dossier validé) à la première cohorte non pleine pour formation + année + campus.
   * Le campus est un critère obligatoire (plusieurs campus par région/département).
   * Si toutes les cohortes sont pleines, crée automatiquement la section suivante (A→B→C).
   * Si aucune cohorte n'existe pour ce campus, crée la première (section A).
   * Règle : uniquement pour inscriptions avec cohortId null et statut INSCRIT ou VALIDE.
   * Traçabilité : AUTO_ASSIGN_COHORT, AUTO_CREATE_COHORT.
   */
  async assignInscriptionToCohort(
    inscriptionId: string,
    userId?: string,
  ): Promise<{ cohortId: string; cohortLabel: string; created: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const inscription = await tx.inscription.findUnique({
        where: { id: inscriptionId },
        include: { formation: true, cohort: true, campus: true },
      });
      if (!inscription) throw new NotFoundException('Inscription non trouvée');
      if (inscription.cohortId != null) {
        throw new BadRequestException(
          'Cette inscription est déjà affectée à une cohorte.',
        );
      }
      const statut = inscription.statut;
      if (statut !== 'INSCRIT' && statut !== 'VALIDE') {
        throw new BadRequestException(
          'Seules les inscriptions au statut INSCRIT ou VALIDE peuvent être affectées à une cohorte (dossier validé).',
        );
      }
      if (inscription.campusId == null) {
        throw new BadRequestException(
          "Le campus est obligatoire pour l'affectation automatique à une cohorte. Renseignez le campus pour cette inscription.",
        );
      }

      const formationId = inscription.formationId;
      const anneeUniv = inscription.anneeUniv;
      const campusId = inscription.campusId;

      if (statut !== 'VALIDE') {
        await tx.inscription.update({
          where: { id: inscriptionId },
          data: { statut: 'VALIDE' },
        });
      }

      const cohorts = await tx.cohort.findMany({
        where: { formationId, annee: anneeUniv, campusId },
        orderBy: [{ nom: 'asc' }, { section: 'asc' }],
      });

      for (const cohort of cohorts) {
        const count = await tx.inscription.count({
          where: { cohortId: cohort.id, statut: { not: 'ANNULEE' } },
        });
        const hasRoom =
          cohort.effectifMax == null || count < cohort.effectifMax;
        if (hasRoom) {
          await tx.inscription.update({
            where: { id: inscriptionId },
            data: { cohortId: cohort.id },
          });
          const cohortLabel = `${cohort.nom}${cohort.section ? ` ${cohort.section}` : ''}`;
          await this.audit.log({
            userId,
            action: 'AUTO_ASSIGN_COHORT',
            entityType: 'Inscription',
            entityId: inscriptionId,
            oldValue: null,
            newValue: JSON.stringify({
              cohortId: cohort.id,
              cohortLabel,
              formationId,
              anneeUniv,
              campusId,
            }),
          });
          return { cohortId: cohort.id, cohortLabel, created: false };
        }
      }

      let targetCohort: {
        id: string;
        nom: string;
        section: string;
        formationId: string;
        campusId: string | null;
        annee: number;
        effectifMax: number | null;
      };
      if (cohorts.length > 0) {
        const last = cohorts[cohorts.length - 1];
        targetCohort = await this.getOrCreateNextSectionCohortInTx(tx, {
          id: last.id,
          nom: last.nom,
          section: last.section,
          formationId: last.formationId,
          campusId: last.campusId,
          annee: last.annee,
          effectifMax: last.effectifMax,
        });
      } else {
        const created = await tx.cohort.create({
          data: {
            nom: inscription.formation.nom,
            section: 'A',
            formationId,
            campusId,
            annee: anneeUniv,
            effectifMax: InscriptionsService.DEFAULT_EFFECTIF_MAX,
          },
          include: { formation: true, campus: true },
        });
        targetCohort = created;
        await this.audit.log({
          userId,
          action: 'AUTO_CREATE_COHORT',
          entityType: 'Cohort',
          entityId: created.id,
          oldValue: null,
          newValue: JSON.stringify({
            nom: created.nom,
            section: created.section,
            formationId,
            anneeUniv,
            campusId,
          }),
        });
      }

      await tx.inscription.update({
        where: { id: inscriptionId },
        data: { cohortId: targetCohort.id },
      });
      const cohortLabel = `${targetCohort.nom}${targetCohort.section ? ` ${targetCohort.section}` : ''}`;
      await this.audit.log({
        userId,
        action: 'AUTO_ASSIGN_COHORT',
        entityType: 'Inscription',
        entityId: inscriptionId,
        oldValue: null,
        newValue: JSON.stringify({
          cohortId: targetCohort.id,
          cohortLabel,
          formationId,
          anneeUniv,
          campusId,
        }),
      });
      return { cohortId: targetCohort.id, cohortLabel, created: true };
    });
  }

  /** Version utilisable dans une transaction Prisma (tx). */
  private async getOrCreateNextSectionCohortInTx(
    tx: Pick<PrismaService, 'cohort'>,
    fullCohort: {
      id: string;
      nom: string;
      section: string;
      formationId: string;
      campusId: string | null;
      annee: number;
      effectifMax: number | null;
    },
  ) {
    if (fullCohort.effectifMax == null) {
      const c = await tx.cohort.findUnique({ where: { id: fullCohort.id } });
      if (!c) throw new NotFoundException('Cohorte non trouvée');
      return c;
    }
    const nextSection = this.nextSectionLetter(fullCohort.section);
    const existing = await tx.cohort.findFirst({
      where: {
        formationId: fullCohort.formationId,
        annee: fullCohort.annee,
        campusId: fullCohort.campusId,
        nom: fullCohort.nom,
        section: nextSection,
      },
    });
    if (existing) return existing;
    return tx.cohort.create({
      data: {
        nom: fullCohort.nom,
        section: nextSection,
        formationId: fullCohort.formationId,
        campusId: fullCohort.campusId,
        annee: fullCohort.annee,
        effectifMax: fullCohort.effectifMax,
      },
    });
  }
}
