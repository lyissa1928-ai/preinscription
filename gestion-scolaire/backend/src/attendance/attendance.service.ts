import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export type TeacherBadgeScanResult = {
  success: boolean;
  code:
    | 'PRESENCE_OK'
    | 'ALREADY_TODAY'
    | 'INVALID_QR'
    | 'BADGE_DISABLED'
    | 'NOT_TEACHER'
    | 'USER_NOT_FOUND'
    | 'REVOKED_QR';
  message: string;
  attendance?: { id: string; heureArrivee: Date };
  teacher?: { firstName: string; lastName: string; matricule: string | null };
};

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async pointArrivee(userId: string, courseId: string) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) throw new NotFoundException('Personne non trouvée');

    const teacher = await this.prisma.teacher.findFirst({
      where: { personId: person.id },
    });
    if (!teacher)
      throw new ForbiddenException('Pointage réservé aux enseignants');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: true },
    });
    if (!course) throw new NotFoundException('Cours non trouvé');
    if (course.teacherId !== teacher.id)
      throw new ForbiddenException('Ce cours ne vous est pas assigné');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jourSemaine = now.getDay();
    const jourEdt = jourSemaine === 0 ? 7 : jourSemaine;
    if (jourEdt !== course.jour) {
      throw new BadRequestException("Ce cours n'est pas prévu aujourd'hui");
    }

    await this.assertPointageAllowedForCourse(
      course.id,
      course.pointageActif,
      today,
    );

    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const existing = await this.prisma.attendance.findFirst({
      where: {
        personId: person.id,
        courseId,
        date: { gte: today, lt: todayEnd },
        heureDepart: null,
      },
    });
    if (existing)
      throw new BadRequestException(
        'Pointage arrivée déjà enregistré pour ce cours',
      );

    return this.prisma.attendance.create({
      data: {
        personId: person.id,
        courseId,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        heureArrivee: now,
        statut: 'PENDING',
        source: 'COURSE',
      },
      include: this.attendanceInclude(),
    });
  }

  async pointDepart(userId: string, courseId: string) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) throw new NotFoundException('Personne non trouvée');

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        personId: person.id,
        courseId,
        date: { gte: todayStart, lt: todayEnd },
        heureDepart: null,
      },
      include: this.attendanceInclude(),
    });
    if (!attendance)
      throw new NotFoundException(
        'Aucun pointage arrivée ouvert pour ce cours',
      );

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { heureDepart: new Date() },
      include: this.attendanceInclude(),
    });
  }

  /**
   * Si des séances planifiées existent pour aujourd’hui : au moins une doit avoir pointageActif.
   * Sinon : le cours doit avoir pointageActif (mode sans séances générées).
   */
  private async assertPointageAllowedForCourse(
    courseId: string,
    coursePointageActif: boolean,
    today: Date,
  ) {
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const seancesToday = await this.prisma.seancePlanning.findMany({
      where: {
        courseId,
        date: { gte: today, lt: tomorrow },
      },
    });
    if (seancesToday.length > 0) {
      if (!seancesToday.some((s) => s.pointageActif)) {
        throw new BadRequestException(
          'Une séance est planifiée aujourd’hui : activez le contrôle d’entrée/sortie sur cette séance (emploi du temps → séances), ou utilisez « Activer toutes les séances à venir ».',
        );
      }
      return;
    }
    if (!coursePointageActif) {
      throw new BadRequestException(
        'Pointage non autorisé : activez le pointage sur le cours (sans séance du jour) ou générez des séances puis activez-les.',
      );
    }
  }

  private attendanceInclude(): Record<string, unknown> {
    return {
      person: { include: { user: true } },
      course: { include: { ec: true, salle: true } },
      validePar: true,
    };
  }

  async getMyAttendances(userId: string, mois?: number, annee?: number) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) return [];

    const where: Record<string, unknown> = { personId: person.id };
    if (mois && annee) {
      const debut = new Date(annee, mois - 1, 1);
      const fin = new Date(annee, mois, 0);
      where.date = { gte: debut, lte: fin };
    }

    return this.prisma.attendance.findMany({
      where,
      include: this.attendanceInclude(),
      orderBy: [{ date: 'desc' }, { heureArrivee: 'desc' }],
    });
  }

  async getCoursesForToday(userId: string) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) return [];

    const teacher = await this.prisma.teacher.findFirst({
      where: { personId: person.id },
    });
    if (!teacher) return [];

    const now = new Date();
    const jour = now.getDay() === 0 ? 7 : now.getDay();
    const anneeUniv =
      now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;

    return this.prisma.course.findMany({
      where: { teacherId: teacher.id, jour, anneeUniv },
      include: { ec: true, salle: true },
      orderBy: { heureDebut: 'asc' },
    });
  }

  async findAll(filters?: {
    personId?: string;
    statut?: string;
    mois?: number;
    annee?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.personId) where.personId = filters.personId;
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.mois && filters?.annee) {
      const debut = new Date(filters.annee, filters.mois - 1, 1);
      const fin = new Date(filters.annee, filters.mois, 0);
      where.date = { gte: debut, lte: fin };
    }

    return this.prisma.attendance.findMany({
      where,
      include: this.attendanceInclude(),
      orderBy: [{ date: 'desc' }, { heureArrivee: 'desc' }],
    });
  }

  async validate(
    id: string,
    userId: string,
    statut: 'VALIDE' | 'NON_REMUNERE' | 'REFUSE',
  ) {
    const att = await this.prisma.attendance.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Pointage non trouvé');
    if (att.statut !== 'PENDING')
      throw new BadRequestException('Pointage déjà traité');

    return this.prisma.attendance.update({
      where: { id },
      data: { statut, valideParId: userId },
      include: this.attendanceInclude(),
    });
  }

  getHeures(attendance: {
    heureArrivee: Date;
    heureDepart: Date | null;
    course?: { type: string };
  }): number {
    if (!attendance.heureDepart) return 0;
    const diff =
      attendance.heureDepart.getTime() - attendance.heureArrivee.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }

  /**
   * Présence journalière enseignant via scan du QR du badge (sans cours ciblé).
   * Une entrée BADGE_DAILY par jour et par personne.
   */
  async recordTeacherPresenceFromBadgeQr(
    qrRaw: string,
  ): Promise<TeacherBadgeScanResult> {
    const log = async (
      userId: string,
      success: boolean,
      code: string,
      detail?: string,
    ) => {
      try {
        await this.prisma.badgeScanLog.create({
          data: {
            userId,
            success,
            messageCode: code,
            detail: detail?.slice(0, 500),
          },
        });
      } catch {
        // ne pas bloquer le flux métier si journal indisponible
      }
    };

    const trimmed = qrRaw?.trim();
    if (!trimmed) {
      return {
        success: false,
        code: 'INVALID_QR',
        message: 'QR vide ou illisible.',
      };
    }

    const parsed = this.usersService.parseGest1BadgeToken(trimmed);
    if (!parsed.ok) {
      return {
        success: false,
        code: 'INVALID_QR',
        message: 'QR inconnu ou format invalide.',
      };
    }

    const live = await this.usersService.assertGest1BadgeTokenLive(
      parsed.userId,
      parsed.version,
    );
    if (live.ok !== true) {
      const why = live.reason;
      const msg =
        why === 'DISABLED'
          ? 'Badge désactivé.'
          : why === 'REVOKED'
            ? 'QR obsolète : le badge a été régénéré.'
            : why === 'ACCOUNT'
              ? 'Compte inactif.'
              : 'Utilisateur introuvable.';
      const code =
        why === 'DISABLED'
          ? 'BADGE_DISABLED'
          : why === 'REVOKED'
            ? 'REVOKED_QR'
            : why === 'USER'
              ? 'USER_NOT_FOUND'
              : 'BADGE_DISABLED';
      await log(parsed.userId, false, code, why);
      return { success: false, code, message: msg };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsed.userId },
      include: { person: { include: { teacher: true } } },
    });
    if (!user?.person?.teacher) {
      await log(parsed.userId, false, 'NOT_TEACHER', 'not_teacher');
      return {
        success: false,
        code: 'NOT_TEACHER',
        message: 'Ce badge n’est pas celui d’un enseignant.',
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const existing = await this.prisma.attendance.findFirst({
      where: {
        personId: user.person.id,
        source: 'BADGE_DAILY',
        date: { gte: today, lt: tomorrow },
      },
    });
    if (existing) {
      await log(user.id, false, 'ALREADY_TODAY', existing.id);
      return {
        success: false,
        code: 'ALREADY_TODAY',
        message: 'Enseignant déjà enregistré aujourd’hui (scan badge).',
        attendance: { id: existing.id, heureArrivee: existing.heureArrivee },
        teacher: {
          firstName: user.firstName,
          lastName: user.lastName,
          matricule: user.person.matricule,
        },
      };
    }

    const att = await this.prisma.attendance.create({
      data: {
        personId: user.person.id,
        courseId: null,
        date: today,
        heureArrivee: now,
        statut: 'VALIDE',
        source: 'BADGE_DAILY',
      },
    });

    await log(user.id, true, 'PRESENCE_OK', att.id);

    return {
      success: true,
      code: 'PRESENCE_OK',
      message: 'Présence enregistrée avec succès.',
      attendance: { id: att.id, heureArrivee: att.heureArrivee },
      teacher: {
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.person.matricule,
      },
    };
  }

  async listBadgeScanLogs(take = 100) {
    return this.prisma.badgeScanLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            matricule: true,
            person: { select: { matricule: true } },
          },
        },
      },
    });
  }
}
