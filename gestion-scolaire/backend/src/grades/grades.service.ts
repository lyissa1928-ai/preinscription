import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STANDARD_EVALUATION_COLUMNS } from './grades-eval.constants';

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async getSessionDeadline(
    anneeUniv: number,
    session: number,
  ): Promise<Date | null> {
    const config = await this.prisma.sessionConfig.findUnique({
      where: { anneeUniv_session: { anneeUniv, session } },
    });
    return config?.dateLimite ?? null;
  }

  private isWithinDeadline(
    anneeUniv: number,
    session: number,
  ): Promise<boolean> {
    return this.getSessionDeadline(anneeUniv, session).then((d) => {
      if (!d) return true;
      return new Date() <= d;
    });
  }

  private async isSessionLockedByJury(
    anneeUniv: number,
    session: number,
  ): Promise<boolean> {
    const config = await this.prisma.sessionConfig.findUnique({
      where: { anneeUniv_session: { anneeUniv, session } },
    });
    return config?.verrouilleJury ?? false;
  }

  async upsertSessionConfig(data: {
    anneeUniv: number;
    session: number;
    dateLimite: Date;
    verrouilleJury?: boolean;
  }) {
    return this.prisma.sessionConfig.upsert({
      where: {
        anneeUniv_session: { anneeUniv: data.anneeUniv, session: data.session },
      },
      create: {
        anneeUniv: data.anneeUniv,
        session: data.session,
        dateLimite: data.dateLimite,
        verrouilleJury: data.verrouilleJury ?? false,
      },
      update: {
        dateLimite: data.dateLimite,
        ...(data.verrouilleJury !== undefined && {
          verrouilleJury: data.verrouilleJury,
        }),
      },
    });
  }

  async getSessionConfigs(anneeUniv?: number) {
    const where = anneeUniv ? { anneeUniv } : {};
    return this.prisma.sessionConfig.findMany({
      where,
      orderBy: [{ anneeUniv: 'desc' }, { session: 'asc' }],
    });
  }

  async createOrUpdateGrade(
    userId: string,
    data: {
      personId: string;
      ecId: string;
      session: number;
      anneeUniv: number;
      note: number;
      evaluationType?: string;
      evaluationLibelle?: string;
    },
  ) {
    if (data.note < 0 || data.note > 20) {
      throw new BadRequestException('La note doit être entre 0 et 20');
    }

    const evaluationType = (data.evaluationType?.trim() || 'EXAMEN').slice(
      0,
      64,
    );
    const evaluationLibelle = (
      data.evaluationLibelle?.trim() || 'Session'
    ).slice(0, 120);
    if (!evaluationLibelle.length) {
      throw new BadRequestException(
        'Le libellé d’évaluation est obligatoire (ex. Session, Devoir 1).',
      );
    }

    const withinDeadline = await this.isWithinDeadline(
      data.anneeUniv,
      data.session,
    );
    if (!withinDeadline) {
      throw new ForbiddenException(
        'Date limite de saisie dépassée. Utilisez la demande de modification.',
      );
    }
    if (await this.isSessionLockedByJury(data.anneeUniv, data.session)) {
      throw new ForbiddenException(
        'Session verrouillée par le jury. Aucune saisie ou modification directe possible.',
      );
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { userId } },
    });
    if (teacher) {
      const course = await this.prisma.course.findFirst({
        where: {
          ecId: data.ecId,
          teacherId: teacher.id,
          anneeUniv: data.anneeUniv,
        },
      });
      if (!course) throw new ForbiddenException("Vous n'enseignez pas cet EC");
    }
    // Sinon : saisie par scolarité / service pédagogique / responsable pédagogique / admin (déjà autorisé par GRADES_WRITE)

    const inscription = await this.prisma.inscription.findFirst({
      where: {
        personId: data.personId,
        anneeUniv: data.anneeUniv,
        statut: { not: 'ANNULEE' },
      },
      include: { maquette: { include: { ues: { include: { ecs: true } } } } },
    });
    if (!inscription) throw new BadRequestException('Étudiant non inscrit');
    const ecInSemestre = inscription.maquette.ues.some((ue) =>
      ue.ecs.some((ec) => ec.id === data.ecId),
    );
    if (!ecInSemestre)
      throw new BadRequestException('EC non concerné par cette inscription');

    const uniqueWhere = {
      personId_ecId_session_anneeUniv_evaluationType_evaluationLibelle: {
        personId: data.personId,
        ecId: data.ecId,
        session: data.session,
        anneeUniv: data.anneeUniv,
        evaluationType,
        evaluationLibelle,
      },
    } as const;

    const existing = await this.prisma.grade.findUnique({
      where: uniqueWhere,
    });

    const result = await this.prisma.grade.upsert({
      where: uniqueWhere,
      create: {
        personId: data.personId,
        ecId: data.ecId,
        session: data.session,
        anneeUniv: data.anneeUniv,
        evaluationType,
        evaluationLibelle,
        note: data.note,
        saisieParId: userId,
      },
      update: { note: data.note, saisieParId: userId },
      include: this.gradeInclude(),
    });
    await this.audit.log({
      userId,
      action: existing ? 'MODIFICATION_NOTE' : 'SAISIE_NOTE',
      entityType: 'Grade',
      entityId: result.id,
      oldValue: existing ? String(existing.note) : undefined,
      newValue: String(data.note),
    });
    return result;
  }

  private gradeInclude(): Record<string, unknown> {
    return {
      person: { include: { user: true } },
      ec: {
        include: {
          ue: { include: { maquette: { include: { semestre: true } } } },
        },
      },
      saisiePar: true,
    };
  }

  async getGradesForEC(
    ecId: string,
    session: number,
    anneeUniv: number,
    semestreId?: string,
    evaluationType?: string,
    evaluationLibelle?: string,
  ) {
    const ec = await this.prisma.eC.findUnique({
      where: { id: ecId },
      include: {
        ue: { include: { maquette: { include: { semestre: true } } } },
      },
    });
    if (!ec) throw new NotFoundException('EC non trouvé');
    const sid = semestreId ?? ec.ue.maquette.semestre.id;

    const where: Record<string, unknown> = {
      ecId,
      session,
      anneeUniv,
      person: {
        inscriptions: {
          some: { semestreId: sid, anneeUniv, statut: { not: 'ANNULEE' } },
        },
      },
    };
    if (evaluationType !== undefined && evaluationType !== '') {
      where.evaluationType = evaluationType;
    }
    if (evaluationLibelle !== undefined && evaluationLibelle !== '') {
      where.evaluationLibelle = evaluationLibelle;
    }
    return this.prisma.grade.findMany({
      where,
      include: this.gradeInclude(),
      orderBy: { person: { matricule: 'asc' } },
    });
  }

  /** Liste des couples (type, libellé) déjà utilisés pour cet EC / session / année. */
  async listEvaluationsForEc(ecId: string, session: number, anneeUniv: number) {
    const rows = await this.prisma.grade.findMany({
      where: { ecId, session, anneeUniv },
      select: { evaluationType: true, evaluationLibelle: true },
    });
    const seen = new Set<string>();
    const out: { evaluationType: string; evaluationLibelle: string }[] = [];
    for (const r of rows) {
      const k = `${r.evaluationType}\t${r.evaluationLibelle}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({
          evaluationType: r.evaluationType,
          evaluationLibelle: r.evaluationLibelle,
        });
      }
    }
    out.sort(
      (a, b) =>
        a.evaluationType.localeCompare(b.evaluationType) ||
        a.evaluationLibelle.localeCompare(b.evaluationLibelle),
    );
    return out;
  }

  async getGradesByPerson(personId: string, anneeUniv?: number) {
    const where: Record<string, unknown> = { personId };
    if (anneeUniv) where.anneeUniv = anneeUniv;
    return this.prisma.grade.findMany({
      where,
      include: { ec: { include: { ue: true } }, saisiePar: true },
      orderBy: [
        { anneeUniv: 'desc' },
        { session: 'asc' },
        { ec: { code: 'asc' } },
      ],
    });
  }

  async createModificationRequest(
    userId: string,
    data: { gradeId: string; motif: string; nouvelleNote: number },
  ) {
    if (data.nouvelleNote < 0 || data.nouvelleNote > 20) {
      throw new BadRequestException('La note doit être entre 0 et 20');
    }

    const grade = await this.prisma.grade.findUnique({
      where: { id: data.gradeId },
      include: { modificationRequests: { where: { statut: 'PENDING' } } },
    });
    if (!grade) throw new NotFoundException('Note non trouvée');
    if (grade.modificationRequests.length > 0) {
      throw new BadRequestException('Une demande est déjà en cours');
    }
    if (await this.isSessionLockedByJury(grade.anneeUniv, grade.session)) {
      throw new ForbiddenException(
        'Session verrouillée par le jury. Aucune nouvelle demande de modification possible.',
      );
    }

    return this.prisma.gradeModificationRequest.create({
      data: {
        gradeId: data.gradeId,
        motif: data.motif,
        demandeurId: userId,
        nouvelleNote: data.nouvelleNote,
      },
      include: {
        grade: { include: this.gradeInclude() },
        demandeur: true,
      },
    });
  }

  async getModificationRequests(statut?: string) {
    const where = statut ? { statut } : {};
    return this.prisma.gradeModificationRequest.findMany({
      where,
      include: {
        grade: { include: this.gradeInclude() },
        demandeur: true,
        validePar: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveModificationRequest(
    id: string,
    userId: string,
    options?: { bypassVerrouilleJury?: boolean },
  ) {
    const req = await this.prisma.gradeModificationRequest.findUnique({
      where: { id },
      include: { grade: true },
    });
    if (!req) throw new NotFoundException('Demande non trouvée');
    if (req.statut !== 'PENDING')
      throw new BadRequestException('Demande déjà traitée');
    if (
      (await this.isSessionLockedByJury(
        req.grade.anneeUniv,
        req.grade.session,
      )) &&
      !options?.bypassVerrouilleJury
    ) {
      throw new ForbiddenException(
        'Session verrouillée par le jury. Seul un Super Admin peut débloquer cette approbation.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.grade.update({
        where: { id: req.gradeId },
        data: { note: req.nouvelleNote ?? req.grade.note },
      }),
      this.prisma.gradeModificationRequest.update({
        where: { id },
        data: {
          statut: 'APPROVED',
          valideParId: userId,
          dateValidation: new Date(),
        },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'APPROBATION_MODIFICATION_NOTE',
      entityType: 'GradeModificationRequest',
      entityId: id,
      oldValue: String(req.grade.note),
      newValue: String(req.nouvelleNote ?? req.grade.note),
    });

    return this.prisma.gradeModificationRequest.findUnique({
      where: { id },
      include: {
        grade: { include: this.gradeInclude() },
        demandeur: true,
        validePar: true,
      },
    });
  }

  async rejectModificationRequest(id: string, userId: string) {
    const req = await this.prisma.gradeModificationRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Demande non trouvée');
    if (req.statut !== 'PENDING')
      throw new BadRequestException('Demande déjà traitée');

    const updated = await this.prisma.gradeModificationRequest.update({
      where: { id },
      data: {
        statut: 'REJECTED',
        valideParId: userId,
        dateValidation: new Date(),
      },
      include: {
        grade: { include: this.gradeInclude() },
        demandeur: true,
        validePar: true,
      },
    });
    await this.audit.log({
      userId,
      action: 'REJET_MODIFICATION_NOTE',
      entityType: 'GradeModificationRequest',
      entityId: id,
      oldValue: 'PENDING',
      newValue: 'REJECTED',
    });
    return updated;
  }

  async getTeacherECs(userId: string, anneeUniv: number) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { userId } },
    });
    if (!teacher) return [];
    const courses = await this.prisma.course.findMany({
      where: { teacherId: teacher.id, anneeUniv },
      include: {
        ec: {
          include: {
            ue: { include: { maquette: { include: { semestre: true } } } },
          },
        },
      },
      distinct: ['ecId'],
    });
    return courses.map((c) => ({
      id: c.ec.id,
      code: c.ec.code,
      nom: c.ec.nom,
      semestre: c.ec.ue.maquette.semestre.numero,
    }));
  }

  async getStudentsForEC(ecId: string, anneeUniv: number) {
    const ec = await this.prisma.eC.findUnique({
      where: { id: ecId },
      include: {
        ue: { include: { maquette: { include: { semestre: true } } } },
      },
    });
    if (!ec) throw new NotFoundException('EC non trouvé');

    const semestreId = ec.ue.maquette.semestre.id;
    const inscriptions = await this.prisma.inscription.findMany({
      where: { semestreId, anneeUniv, statut: { not: 'ANNULEE' } },
      include: { person: { include: { user: true } } },
      orderBy: { person: { matricule: 'asc' } },
    });
    return inscriptions.map((i) => ({
      personId: i.personId,
      matricule: i.person.matricule,
      nom: i.person.user
        ? `${i.person.user.firstName} ${i.person.user.lastName}`
        : i.person.matricule,
    }));
  }

  /** Notes par classe : liste des étudiants de la cohorte pour une année donnée */
  async getStudentsByCohort(cohortId: string, anneeUniv: number) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { formation: true },
    });
    if (!cohort) throw new NotFoundException('Classe non trouvée');
    const inscriptions = await this.prisma.inscription.findMany({
      where: { cohortId, anneeUniv, statut: { not: 'ANNULEE' } },
      include: { person: { include: { user: true } } },
      orderBy: { person: { matricule: 'asc' } },
    });
    return inscriptions.map((i) => ({
      personId: i.personId,
      matricule: i.person.matricule ?? '',
      nom: i.person.user?.lastName ?? '',
      prenom: i.person.user?.firstName ?? '',
    }));
  }

  /** ECs (évaluations) du semestre pour la formation de la cohorte — session 1 = S1, session 2 = S2 */
  async getECsForCohort(cohortId: string, anneeUniv: number, session: number) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { formation: true },
    });
    if (!cohort) throw new NotFoundException('Classe non trouvée');
    const semestre = await this.prisma.semestre.findFirst({
      where: { formationId: cohort.formationId, numero: session },
      include: {
        maquettes: {
          take: 1,
          orderBy: { anneeRef: 'desc' },
          include: { ues: { include: { ecs: true } } },
        },
      },
    });
    if (!semestre?.maquettes?.[0]) return [];
    const ecs: { id: string; code: string; nom: string }[] = [];
    for (const ue of semestre.maquettes[0].ues) {
      for (const ec of ue.ecs) {
        ecs.push({ id: ec.id, code: ec.code, nom: ec.nom });
      }
    }
    return ecs;
  }

  /** Grille notes par classe : étudiants + notes par EC pour session/anneeUniv */
  async getGradesGridForCohort(
    cohortId: string,
    anneeUniv: number,
    session: number,
  ) {
    const [students, ecs, grades] = await Promise.all([
      this.getStudentsByCohort(cohortId, anneeUniv),
      this.getECsForCohort(cohortId, anneeUniv, session),
      this.prisma.grade.findMany({
        where: {
          anneeUniv,
          session,
          evaluationType: 'EXAMEN',
          evaluationLibelle: 'Session',
          personId: {
            in: (await this.getStudentsByCohort(cohortId, anneeUniv)).map(
              (s) => s.personId,
            ),
          },
        },
        include: { ec: true },
      }),
    ]);
    const gradeMap = new Map<string, number>();
    for (const g of grades) {
      gradeMap.set(`${g.personId}:${g.ecId}`, g.note);
    }
    return {
      students,
      ecs,
      grid: students.map((s) => ({
        ...s,
        notes: ecs.map((ec) => ({
          ecId: ec.id,
          note: gradeMap.get(`${s.personId}:${ec.id}`) ?? null,
        })),
      })),
    };
  }

  /** Génère un CSV pour la saisie des notes : matricule, nom, prénom, puis une colonne par EC (code EC). */
  getNotesTemplateCsv(
    students: { matricule: string; nom: string; prenom: string }[],
    ecs: { id: string; code: string; nom: string }[],
  ): string {
    const sep = ';';
    const header = ['matricule', 'nom', 'prenom', ...ecs.map((e) => e.code)];
    const rows = students.map((s) => [
      s.matricule,
      s.nom,
      s.prenom,
      ...ecs.map(() => ''),
    ]);
    return [header.join(sep), ...rows.map((r) => r.join(sep))].join('\n');
  }

  private parseRollDateUtc(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr?.trim() ?? '');
    if (!m) throw new BadRequestException('Date invalide (format AAAA-MM-JJ)');
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
  }

  /** Lundi (midi UTC) de la semaine civile contenant `dateStr` (lun–dim). */
  private mondayOfWeekContainingUtc(dateStr: string): Date {
    const d = this.parseRollDateUtc(dateStr);
    const dow = d.getUTCDay(); // 0 = dimanche … 6 = samedi
    const delta = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setUTCDate(mon.getUTCDate() + delta);
    mon.setUTCHours(12, 0, 0, 0);
    return mon;
  }

  private isoDateUtc(d: Date): string {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }

  /** Présence lun–ven pour une cohorte (5 colonnes). */
  async getClassRollWeek(
    userId: string,
    role: string,
    cohortId: string,
    anneeUniv: number,
    weekRefDateStr: string,
  ) {
    if (!weekRefDateStr?.trim())
      throw new BadRequestException('Paramètre weekStart requis (AAAA-MM-JJ).');
    await this.assertCohortRollAccess(userId, role, cohortId, anneeUniv);
    const monday = this.mondayOfWeekContainingUtc(weekRefDateStr);
    const dayLabels = [
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
    ] as const;
    const dayMetas: { date: Date; dateStr: string; label: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const dt = new Date(monday);
      dt.setUTCDate(dt.getUTCDate() + i);
      dt.setUTCHours(12, 0, 0, 0);
      dayMetas.push({
        date: dt,
        dateStr: this.isoDateUtc(dt),
        label: dayLabels[i],
      });
    }
    const students = await this.getStudentsByCohort(cohortId, anneeUniv);
    const rolls = await this.prisma.classRollCall.findMany({
      where: { cohortId, date: { in: dayMetas.map((x) => x.date) } },
    });
    const rollLookup = new Map<string, (typeof rolls)[number]>();
    for (const r of rolls) {
      const key = `${r.date.getTime()}\t${r.personId}`;
      rollLookup.set(key, r);
    }
    return {
      weekStart: dayMetas[0].dateStr,
      cohortId,
      anneeUniv,
      days: dayMetas.map((dm) => ({
        date: dm.dateStr,
        label: dm.label,
        students: students.map((s) => {
          const r = rollLookup.get(`${dm.date.getTime()}\t${s.personId}`);
          return {
            personId: s.personId,
            matricule: s.matricule,
            nom: s.nom,
            prenom: s.prenom,
            status: (r?.status as string) ?? 'ABSENT',
            comment: r?.comment ?? null,
            rollId: r?.id ?? null,
          };
        }),
      })),
    };
  }

  /** Enregistrement groupé : une entrée = un jour + un étudiant (plusieurs jours possibles). */
  async saveClassRollWeekBatch(
    userId: string,
    role: string,
    cohortId: string,
    anneeUniv: number,
    entries: {
      personId: string;
      date: string;
      status: string;
      comment?: string | null;
    }[],
  ) {
    if (!entries?.length)
      throw new BadRequestException('Aucune ligne à enregistrer.');
    await this.assertCohortRollAccess(userId, role, cohortId, anneeUniv);
    const students = await this.getStudentsByCohort(cohortId, anneeUniv);
    const allowed = new Set(students.map((s) => s.personId));
    const ok = new Set(['PRESENT', 'ABSENT', 'RETARD', 'EXCUSE']);
    for (const e of entries) {
      if (!allowed.has(e.personId))
        throw new BadRequestException(
          `Étudiant non inscrit dans cette classe : ${e.personId}`,
        );
      const st = (e.status || 'ABSENT').toUpperCase();
      if (!ok.has(st))
        throw new BadRequestException(`Statut invalide : ${e.status}`);
    }
    for (const e of entries) {
      const day = this.parseRollDateUtc(e.date);
      const st = (e.status || 'ABSENT').toUpperCase();
      await this.prisma.classRollCall.upsert({
        where: {
          cohortId_date_personId: { cohortId, date: day, personId: e.personId },
        },
        create: {
          cohortId,
          date: day,
          personId: e.personId,
          status: st,
          comment: e.comment?.trim() || null,
          recordedById: userId,
        },
        update: {
          status: st,
          comment: e.comment?.trim() || null,
          recordedById: userId,
        },
      });
    }
    return this.getClassRollWeek(
      userId,
      role,
      cohortId,
      anneeUniv,
      entries[0].date,
    );
  }

  private async assertTeacherTeachesCohort(
    userId: string,
    cohortId: string,
    anneeUniv: number,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { userId } },
    });
    if (!teacher) throw new ForbiddenException('Profil enseignant requis');
    const n = await this.prisma.course.count({
      where: { teacherId: teacher.id, cohortId, anneeUniv },
    });
    if (n === 0)
      throw new ForbiddenException(
        'Vous n’avez pas de cours dans cette classe pour cette année.',
      );
  }

  private async assertTeacherTeachesEc(
    userId: string,
    ecId: string,
    anneeUniv: number,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { userId } },
    });
    if (!teacher) throw new ForbiddenException('Profil enseignant requis');
    const n = await this.prisma.course.count({
      where: { teacherId: teacher.id, ecId, anneeUniv },
    });
    if (n === 0)
      throw new ForbiddenException(
        'Vous n’enseignez pas cet EC pour cette année.',
      );
  }

  private async assertCohortRollAccess(
    userId: string,
    role: string,
    cohortId: string,
    anneeUniv: number,
  ): Promise<void> {
    if (role === 'TEACHER')
      await this.assertTeacherTeachesCohort(userId, cohortId, anneeUniv);
  }

  private async assertEcEvaluationSheetAccess(
    userId: string,
    role: string,
    ecId: string,
    anneeUniv: number,
  ): Promise<void> {
    if (role === 'TEACHER')
      await this.assertTeacherTeachesEc(userId, ecId, anneeUniv);
  }

  /** Classes (cohortes) où l’enseignant a au moins un cours sur l’année universitaire. */
  async getTeacherCohorts(userId: string, anneeUniv: number) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { userId } },
    });
    if (!teacher) return [];
    const courses = await this.prisma.course.findMany({
      where: { teacherId: teacher.id, anneeUniv, cohortId: { not: null } },
      include: { cohort: { include: { formation: true } } },
    });
    const map = new Map<
      string,
      {
        id: string;
        nom: string;
        section: string;
        formationCode: string;
        formationNom: string;
        annee: number;
      }
    >();
    for (const c of courses) {
      if (!c.cohort) continue;
      if (!map.has(c.cohort.id)) {
        map.set(c.cohort.id, {
          id: c.cohort.id,
          nom: c.cohort.nom,
          section: c.cohort.section,
          formationCode: c.cohort.formation.code,
          formationNom: c.cohort.formation.nom ?? c.cohort.formation.code,
          annee: c.cohort.annee,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        a.formationCode.localeCompare(b.formationCode) ||
        a.nom.localeCompare(b.nom),
    );
  }

  async getClassRollSheet(
    userId: string,
    role: string,
    cohortId: string,
    anneeUniv: number,
    dateStr: string,
  ) {
    await this.assertCohortRollAccess(userId, role, cohortId, anneeUniv);
    const day = this.parseRollDateUtc(dateStr);
    const students = await this.getStudentsByCohort(cohortId, anneeUniv);
    const rolls = await this.prisma.classRollCall.findMany({
      where: { cohortId, date: day },
    });
    const byPerson = new Map<string, (typeof rolls)[number]>(
      rolls.map((r) => [r.personId, r]),
    );
    return {
      date: dateStr,
      cohortId,
      anneeUniv,
      students: students.map((s) => {
        const r = byPerson.get(s.personId);
        return {
          personId: s.personId,
          matricule: s.matricule,
          nom: s.nom,
          prenom: s.prenom,
          status: (r?.status as string) ?? 'ABSENT',
          comment: r?.comment ?? null,
          rollId: r?.id ?? null,
        };
      }),
    };
  }

  async saveClassRollBatch(
    userId: string,
    role: string,
    cohortId: string,
    anneeUniv: number,
    dateStr: string,
    entries: { personId: string; status: string; comment?: string | null }[],
  ) {
    await this.assertCohortRollAccess(userId, role, cohortId, anneeUniv);
    const day = this.parseRollDateUtc(dateStr);
    const students = await this.getStudentsByCohort(cohortId, anneeUniv);
    const allowed = new Set(students.map((s) => s.personId));
    const ok = new Set(['PRESENT', 'ABSENT', 'RETARD', 'EXCUSE']);
    for (const e of entries) {
      if (!allowed.has(e.personId))
        throw new BadRequestException(
          `Étudiant non inscrit dans cette classe : ${e.personId}`,
        );
      const st = (e.status || 'ABSENT').toUpperCase();
      if (!ok.has(st))
        throw new BadRequestException(`Statut invalide : ${e.status}`);
    }
    for (const e of entries) {
      const st = (e.status || 'ABSENT').toUpperCase();
      await this.prisma.classRollCall.upsert({
        where: {
          cohortId_date_personId: { cohortId, date: day, personId: e.personId },
        },
        create: {
          cohortId,
          date: day,
          personId: e.personId,
          status: st,
          comment: e.comment?.trim() || null,
          recordedById: userId,
        },
        update: {
          status: st,
          comment: e.comment?.trim() || null,
          recordedById: userId,
        },
      });
    }
    return this.getClassRollSheet(userId, role, cohortId, anneeUniv, dateStr);
  }

  async getEvaluationSheetForEc(
    userId: string,
    role: string,
    ecId: string,
    session: number,
    anneeUniv: number,
  ) {
    await this.assertEcEvaluationSheetAccess(userId, role, ecId, anneeUniv);
    const students = await this.getStudentsForEC(ecId, anneeUniv);
    if (students.length === 0) {
      return {
        ecId,
        session,
        anneeUniv,
        columns: STANDARD_EVALUATION_COLUMNS,
        students: [],
      };
    }
    const personIds = students.map((s) => s.personId);
    const grades = await this.prisma.grade.findMany({
      where: { ecId, session, anneeUniv, personId: { in: personIds } },
    });
    const gmap = new Map<string, { id: string; note: number }>();
    for (const g of grades) {
      gmap.set(`${g.personId}\t${g.evaluationType}\t${g.evaluationLibelle}`, {
        id: g.id,
        note: g.note,
      });
    }
    return {
      ecId,
      session,
      anneeUniv,
      columns: STANDARD_EVALUATION_COLUMNS,
      students: students.map((s) => {
        const notes: Record<string, { gradeId: string; note: number } | null> =
          {};
        for (const col of STANDARD_EVALUATION_COLUMNS) {
          const k = `${s.personId}\t${col.evaluationType}\t${col.evaluationLibelle}`;
          const found = gmap.get(k);
          notes[col.key] = found
            ? { gradeId: found.id, note: found.note }
            : null;
        }
        return {
          personId: s.personId,
          matricule: s.matricule,
          nom: s.nom,
          notes,
        };
      }),
    };
  }

  async saveEvaluationSheetBatch(
    userId: string,
    role: string,
    ecId: string,
    session: number,
    anneeUniv: number,
    rows: {
      personId: string;
      notes: Partial<Record<string, number | null | undefined>>;
    }[],
  ) {
    await this.assertEcEvaluationSheetAccess(userId, role, ecId, anneeUniv);
    for (const row of rows) {
      for (const col of STANDARD_EVALUATION_COLUMNS) {
        const raw = row.notes[col.key];
        if (raw === undefined || raw === null || String(raw).trim() === '')
          continue;
        const note = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (Number.isNaN(note)) continue;
        await this.createOrUpdateGrade(userId, {
          personId: row.personId,
          ecId,
          session,
          anneeUniv,
          note,
          evaluationType: col.evaluationType,
          evaluationLibelle: col.evaluationLibelle,
        });
      }
    }
    return this.getEvaluationSheetForEc(userId, role, ecId, session, anneeUniv);
  }
}
