import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  /** Évite les FK invalides : le front envoie souvent "" au lieu de null pour les selects optionnels. */
  private optFkId(v: string | null | undefined): string | undefined {
    const t = typeof v === 'string' ? v.trim() : '';
    return t.length > 0 ? t : undefined;
  }

  /**
   * Conflits uniquement si les intervalles [heureDebut, heureFin] se chevauchent (même jour, même année univ).
   * Ex. salle A : 8h–10h puis 10h–12h → OK (bords adjacents 10h = pas de chevauchement). Deux cours 8h–10h → refus.
   */
  private async checkConflicts(data: {
    salleId: string;
    teacherId: string;
    jour: number;
    heureDebut: number;
    heureFin: number;
    anneeUniv: number;
    groupe?: string | null;
    excludeId?: string;
  }): Promise<string[]> {
    const conflicts: string[] = [];
    const {
      salleId,
      teacherId,
      jour,
      heureDebut,
      heureFin,
      anneeUniv,
      groupe,
      excludeId,
    } = data;

    const overlapping = await this.prisma.course.findMany({
      where: {
        jour,
        anneeUniv,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // Chevauchement : autre.heureDebut < nouveau.heureFin ET autre.heureFin > nouveau.heureDebut
        AND: [
          { heureDebut: { lt: heureFin } },
          { heureFin: { gt: heureDebut } },
        ],
      },
      include: {
        salle: { include: { campus: true } },
        teacher: { include: { person: { include: { user: true } } } },
      },
    });

    const newSalle = await this.prisma.salle.findUnique({
      where: { id: salleId },
      include: { campus: true },
    });
    const newCampusId = newSalle?.campusId ?? null;

    for (const c of overlapping) {
      if (c.salleId === salleId) {
        conflicts.push(
          `La salle « ${c.salle.nom} » est déjà utilisée sur un créneau qui se chevauche (plusieurs cours dans la même salle sont autorisés à des heures différentes sans chevauchement).`,
        );
      }
      if (c.teacherId === teacherId) {
        const otherCampusId = c.salle.campusId ?? null;
        if (newCampusId && otherCampusId && otherCampusId !== newCampusId) {
          conflicts.push(
            `L'enseignant est déjà programmé sur un créneau qui se chevauche sur un autre campus (interdit : un enseignant ne peut pas être sur deux campus en même temps).`,
          );
        } else {
          conflicts.push(
            `L'enseignant est déjà occupé sur un créneau qui se chevauche (emploi du temps).`,
          );
        }
      }
      if (groupe && c.groupe === groupe) {
        conflicts.push(
          `Conflit sur le libellé de groupe « ${groupe} » : un autre cours avec le même groupe chevauche ce créneau.`,
        );
      }
    }

    return [...new Set(conflicts)];
  }

  async create(data: {
    ecId: string;
    teacherId: string;
    salleId: string;
    jour: number;
    heureDebut: number;
    heureFin: number;
    type: string;
    groupe?: string;
    anneeUniv: number;
    cohortId?: string | null;
    groupId?: string | null;
    pointageActif?: boolean;
  }) {
    if (data.heureDebut >= data.heureFin) {
      throw new BadRequestException(
        'Heure de fin doit être après heure de début',
      );
    }
    if (data.jour < 1 || data.jour > 6) {
      throw new BadRequestException(
        'Jour doit être entre 1 (Lundi) et 6 (Samedi)',
      );
    }
    if (data.heureDebut < 8 || data.heureFin > 23) {
      throw new BadRequestException(
        'Les cours sont autorisés de 8h à 23h (heures entières, fin au plus tard 23h).',
      );
    }

    const ecId = this.optFkId(data.ecId);
    const teacherId = this.optFkId(data.teacherId);
    const salleId = this.optFkId(data.salleId);
    if (!ecId || !teacherId || !salleId) {
      throw new BadRequestException(
        'EC, enseignant et salle sont obligatoires (identifiants valides).',
      );
    }

    const cohortIdOpt = this.optFkId(data.cohortId);
    const groupIdOpt = this.optFkId(data.groupId);

    const ec = await this.prisma.eC.findUnique({ where: { id: ecId } });
    if (!ec) throw new NotFoundException('EC non trouvé');
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher)
      throw new NotFoundException(
        'Enseignant non trouvé (vérifiez que vous utilisez l’id enseignant, pas le matricule).',
      );
    const salle = await this.prisma.salle.findUnique({
      where: { id: salleId },
    });
    if (!salle) throw new NotFoundException('Salle non trouvée');

    if (cohortIdOpt) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortIdOpt },
      });
      if (!cohort) throw new NotFoundException('Classe (cohorte) introuvable');
      if (
        cohort.campusId &&
        salle.campusId &&
        cohort.campusId !== salle.campusId
      ) {
        throw new BadRequestException(
          'La salle doit être sur le même campus que la classe (cohorte) rattachée au cours.',
        );
      }
    }

    if (groupIdOpt) {
      const tg = await this.prisma.teachingGroup.findUnique({
        where: { id: groupIdOpt },
      });
      if (!tg)
        throw new NotFoundException(
          'Groupe pédagogique (TeachingGroup) introuvable',
        );
    }

    const conflicts = await this.checkConflicts({
      salleId,
      teacherId,
      jour: data.jour,
      heureDebut: data.heureDebut,
      heureFin: data.heureFin,
      anneeUniv: data.anneeUniv,
      groupe: data.groupe ?? null,
    });
    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.join(' ; '));
    }

    const groupeLibelle =
      typeof data.groupe === 'string' && data.groupe.trim()
        ? data.groupe.trim()
        : undefined;

    return this.prisma.course.create({
      data: {
        ecId,
        teacherId,
        salleId,
        jour: data.jour,
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        type: data.type,
        groupe: groupeLibelle,
        anneeUniv: data.anneeUniv,
        ...(cohortIdOpt ? { cohortId: cohortIdOpt } : {}),
        ...(groupIdOpt ? { groupId: groupIdOpt } : {}),
        pointageActif: data.pointageActif ?? false,
      },
      include: this.courseInclude(),
    });
  }

  private courseInclude(): Record<string, unknown> {
    return {
      ec: {
        include: {
          ue: {
            include: {
              maquette: {
                include: { semestre: { include: { formation: true } } },
              },
            },
          },
        },
      },
      teacher: { include: { person: { include: { user: true } } } },
      salle: { include: { campus: true } },
      cohort: { include: { formation: true, campus: true } },
    };
  }

  async findAll(filters?: {
    semestreId?: string;
    formationId?: string;
    teacherId?: string;
    salleId?: string;
    campusId?: string;
    anneeUniv?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.anneeUniv) where.anneeUniv = filters.anneeUniv;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.salleId) where.salleId = filters.salleId;
    if (filters?.campusId) where.salle = { campusId: filters.campusId };
    if (filters?.semestreId) {
      where.ec = {
        ue: { maquette: { semestreId: filters.semestreId } },
      };
    }
    if (filters?.formationId) {
      where.ec = {
        ue: {
          maquette: {
            semestre: { formationId: filters.formationId },
          },
        },
      };
    }

    return this.prisma.course.findMany({
      where,
      include: this.courseInclude(),
      orderBy: [{ jour: 'asc' }, { heureDebut: 'asc' }],
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.course.findUnique({
      where: { id },
      include: this.courseInclude(),
    });
    if (!c) throw new NotFoundException('Cours non trouvé');
    return c;
  }

  async update(
    id: string,
    data: Partial<{
      ecId: string;
      teacherId: string;
      salleId: string;
      jour: number;
      heureDebut: number;
      heureFin: number;
      type: string;
      groupe: string;
      anneeUniv: number;
      cohortId: string | null;
      groupId: string | null;
      pointageActif: boolean;
    }>,
  ) {
    const patch = { ...data };
    if (patch.cohortId !== undefined) {
      patch.cohortId =
        patch.cohortId === null ? null : (this.optFkId(patch.cohortId) ?? null);
    }
    if (patch.groupId !== undefined) {
      patch.groupId =
        patch.groupId === null ? null : (this.optFkId(patch.groupId) ?? null);
    }

    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cours non trouvé');

    const merged = { ...existing, ...patch };
    if (merged.heureDebut >= merged.heureFin) {
      throw new BadRequestException(
        'Heure de fin doit être après heure de début',
      );
    }
    if (merged.jour < 1 || merged.jour > 6) {
      throw new BadRequestException(
        'Jour doit être entre 1 (Lundi) et 6 (Samedi)',
      );
    }
    if (merged.heureDebut < 8 || merged.heureFin > 23) {
      throw new BadRequestException(
        'Les cours sont autorisés de 8h à 23h (heures entières, fin au plus tard 23h).',
      );
    }

    const salUpd = await this.prisma.salle.findUnique({
      where: { id: merged.salleId },
    });
    const cohortId = merged.cohortId ?? existing.cohortId;
    if (cohortId && salUpd) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
      });
      if (!cohort) throw new NotFoundException('Classe (cohorte) introuvable');
      if (
        cohort.campusId &&
        salUpd.campusId &&
        cohort.campusId !== salUpd.campusId
      ) {
        throw new BadRequestException(
          'La salle doit être sur le même campus que la classe (cohorte) rattachée au cours.',
        );
      }
    }

    const conflicts = await this.checkConflicts({
      salleId: merged.salleId,
      teacherId: merged.teacherId,
      jour: merged.jour,
      heureDebut: merged.heureDebut,
      heureFin: merged.heureFin,
      anneeUniv: merged.anneeUniv,
      groupe: merged.groupe ?? null,
      excludeId: id,
    });
    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.join(' ; '));
    }

    if (patch.groupId) {
      const tg = await this.prisma.teachingGroup.findUnique({
        where: { id: patch.groupId },
      });
      if (!tg)
        throw new NotFoundException(
          'Groupe pédagogique (TeachingGroup) introuvable',
        );
    }

    return this.prisma.course.update({
      where: { id },
      data: patch,
      include: this.courseInclude(),
    });
  }

  async delete(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cours non trouvé');
    return this.prisma.course.delete({ where: { id } });
  }

  async checkConflictsPreview(data: {
    salleId: string;
    teacherId: string;
    jour: number;
    heureDebut: number;
    heureFin: number;
    anneeUniv: number;
    groupe?: string | null;
    /** Lors de l’édition d’un cours : ignorer ce cours pour ne pas se prendre en conflit avec soi-même */
    excludeCourseId?: string;
  }) {
    const { excludeCourseId, ...rest } = data;
    return this.checkConflicts({ ...rest, excludeId: excludeCourseId });
  }

  /** Classes distinctes rattachées aux cours de l’enseignant (pour notes / effectifs). */
  async getDistinctCohortsForTeacher(personId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { personId },
    });
    if (!teacher) return [];
    const courses = await this.prisma.course.findMany({
      where: { teacherId: teacher.id, cohortId: { not: null } },
      select: { cohortId: true },
    });
    const ids = [
      ...new Set(courses.map((c) => c.cohortId).filter(Boolean)),
    ] as string[];
    if (ids.length === 0) return [];
    return this.prisma.cohort.findMany({
      where: { id: { in: ids } },
      include: { formation: true, campus: true },
      orderBy: [{ annee: 'desc' }, { nom: 'asc' }],
    });
  }

  async findByTeacherPersonId(personId: string, anneeUniv?: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { personId },
    });
    if (!teacher) return [];
    return this.findAll({ teacherId: teacher.id, anneeUniv });
  }

  /** Pour le tableau de bord enseignant : modules en cours (année en cours) et historique (années passées). */
  async getDashboardForTeacher(personId: string): Promise<{
    enCours: Awaited<ReturnType<typeof this.findAll>>;
    historique: Awaited<ReturnType<typeof this.findAll>>;
  }> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { personId },
    });
    if (!teacher) return { enCours: [], historique: [] };
    const currentYear = new Date().getFullYear();
    const enCours = await this.findAll({
      teacherId: teacher.id,
      anneeUniv: currentYear,
    });
    const allPast = await this.prisma.course.findMany({
      where: { teacherId: teacher.id, anneeUniv: { lt: currentYear } },
      include: this.courseInclude(),
      orderBy: [{ anneeUniv: 'desc' }, { jour: 'asc' }, { heureDebut: 'asc' }],
    });
    return { enCours, historique: allPast };
  }

  async findByStudentSemestre(semestreId: string, anneeUniv?: number) {
    return this.findAll({ semestreId, anneeUniv });
  }

  async bulkCreate(
    items: Array<{
      ecCode: string;
      teacherMatricule: string;
      salleCode: string;
      jour: number;
      heureDebut: number;
      heureFin: number;
      type: string;
      groupe?: string;
      anneeUniv: number;
    }>,
  ) {
    const ecCodes = [...new Set(items.map((i) => i.ecCode))];
    const ecs = await this.prisma.eC.findMany({
      where: { code: { in: ecCodes } },
    });
    const ecByCode = new Map(ecs.map((e) => [e.code, e.id]));

    const matricules = [...new Set(items.map((i) => i.teacherMatricule))];
    const persons = await this.prisma.person.findMany({
      where: { matricule: { in: matricules }, type: 'TEACHER' },
      include: { teacher: true },
    });
    const teacherByMatricule = new Map(
      persons.filter((p) => p.teacher).map((p) => [p.matricule, p.teacher!.id]),
    );

    const salleCodes = [...new Set(items.map((i) => i.salleCode))];
    const salles = await this.prisma.salle.findMany({
      where: {
        OR: [{ code: { in: salleCodes } }, { nom: { in: salleCodes } }],
      },
    });
    const salleByCode = new Map<string, string>();
    salles.forEach((s) => {
      salleByCode.set(s.code ?? s.nom, s.id);
      salleByCode.set(s.nom, s.id);
    });

    const created: unknown[] = [];
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ecId = ecByCode.get(it.ecCode);
      const teacherId = teacherByMatricule.get(it.teacherMatricule);
      const salleId = salleByCode.get(it.salleCode);
      if (!ecId) {
        errors.push(`Ligne ${i + 2}: EC "${it.ecCode}" introuvable`);
        continue;
      }
      if (!teacherId) {
        errors.push(
          `Ligne ${i + 2}: Enseignant matricule "${it.teacherMatricule}" introuvable`,
        );
        continue;
      }
      if (!salleId) {
        errors.push(`Ligne ${i + 2}: Salle "${it.salleCode}" introuvable`);
        continue;
      }
      try {
        const c = await this.create({
          ecId: ecId as string,
          teacherId: teacherId as string,
          salleId,
          jour: it.jour,
          heureDebut: it.heureDebut,
          heureFin: it.heureFin,
          type: it.type,
          groupe: it.groupe,
          anneeUniv: it.anneeUniv,
        });
        created.push(c);
      } catch (e) {
        errors.push(
          `Ligne ${i + 2}: ${e instanceof Error ? e.message : 'Erreur'}`,
        );
      }
    }
    return { created: created.length, errors };
  }

  async bulkUpdate(
    items: Array<
      { id: string } & Partial<{
        ecId: string;
        teacherId: string;
        salleId: string;
        jour: number;
        heureDebut: number;
        heureFin: number;
        type: string;
        groupe: string;
        anneeUniv: number;
      }>
    >,
  ) {
    let updated = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const { id, ...data } = items[i];
      try {
        await this.update(id, data);
        updated++;
      } catch (e) {
        errors.push(
          `Ligne ${i + 1}: ${e instanceof Error ? e.message : 'Erreur'}`,
        );
      }
    }
    return { updated, errors };
  }

  async bulkDelete(ids: string[]) {
    const r = await this.prisma.course.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: r.count };
  }

  getTemplateCsv(): string {
    const BOM = '\uFEFF';
    const header =
      'ecCode;teacherMatricule;salleCode;jour;heureDebut;heureFin;type;groupe;anneeUniv';
    return BOM + header + '\nMEC101;TCH-2024-0001;S101;1;8;10;CM;G1;2024\n';
  }

  getTemplateExcel(): Buffer {
    const XLSX = require('xlsx');
    const headers = [
      'ecCode',
      'teacherMatricule',
      'salleCode',
      'jour',
      'heureDebut',
      'heureFin',
      'type',
      'groupe',
      'anneeUniv',
    ];
    const rows = [
      headers,
      ['MEC101', 'TCH-2024-0001', 'S101', 1, 8, 10, 'CM', 'G1', 2024],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Emploi du temps');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
