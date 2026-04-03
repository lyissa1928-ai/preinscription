import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeancesService {
  constructor(private prisma: PrismaService) {}

  /** Créneau récurrent (jour + heures entières → minutes depuis minuit). */
  private async getOrCreateTimeSlot(
    jour: number,
    heureDebut: number,
    heureFin: number,
  ) {
    const startTime = heureDebut * 60;
    const endTime = heureFin * 60;
    let ts = await this.prisma.timeSlot.findFirst({
      where: { dayOfWeek: jour, startTime, endTime },
    });
    if (!ts) {
      ts = await this.prisma.timeSlot.create({
        data: { dayOfWeek: jour, startTime, endTime },
      });
    }
    return ts;
  }

  /** Premier jour `weekday` (1=lun … 7=dim) à partir de `from` (date locale). */
  private alignToWeekday(from: Date, weekday: number): Date {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const js = d.getDay();
    const current = js === 0 ? 7 : js;
    let diff = weekday - current;
    if (diff < 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private isoWeekNumber(d: Date): number {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  async listByCourse(courseId: string) {
    return this.prisma.seancePlanning.findMany({
      where: { courseId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: { timeSlot: true, salle: true },
    });
  }

  /**
   * Génère une séance par semaine (même jour / créneau que le cours) à partir de dateDebut.
   * Ignore les dates où une séance existe déjà pour ce cours.
   */
  async generateForCourse(
    courseId: string,
    dateDebut: Date,
    nbSemaines: number,
    userId: string,
  ) {
    if (nbSemaines < 1 || nbSemaines > 52) {
      throw new BadRequestException('nbSemaines doit être entre 1 et 52');
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: true, salle: true },
    });
    if (!course) throw new NotFoundException('Cours non trouvé');

    const ts = await this.getOrCreateTimeSlot(
      course.jour,
      course.heureDebut,
      course.heureFin,
    );
    const anchor = this.alignToWeekday(dateDebut, course.jour);
    const generated: string[] = [];
    let skipped = 0;

    for (let w = 0; w < nbSemaines; w++) {
      const sessionDate = new Date(anchor);
      sessionDate.setDate(anchor.getDate() + w * 7);
      const dayStart = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate(),
      );
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const exists = await this.prisma.seancePlanning.findFirst({
        where: {
          courseId,
          date: { gte: dayStart, lt: dayEnd },
        },
      });
      if (exists) {
        skipped++;
        continue;
      }

      await this.prisma.seancePlanning.create({
        data: {
          courseId,
          timeSlotId: ts.id,
          salleId: course.salleId,
          ...(course.groupId ? { groupId: course.groupId } : {}),
          teacherId: course.teacherId,
          createdById: userId,
          date: dayStart,
          semaineRef: this.isoWeekNumber(dayStart),
          statut: 'PLANIFIE',
          pointageActif: false,
        },
      });
      generated.push(dayStart.toISOString());
    }

    return { created: generated.length, skipped, dates: generated };
  }

  async setPointageSeance(seanceId: string, pointageActif: boolean) {
    const s = await this.prisma.seancePlanning.findUnique({
      where: { id: seanceId },
    });
    if (!s) throw new NotFoundException('Séance non trouvée');
    return this.prisma.seancePlanning.update({
      where: { id: seanceId },
      data: { pointageActif },
    });
  }

  /** Active le contrôle entrée/sortie sur toutes les séances planifiées à partir d’aujourd’hui. */
  async activateAllUpcomingForCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Cours non trouvé');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const r = await this.prisma.seancePlanning.updateMany({
      where: {
        courseId,
        date: { gte: today },
        statut: 'PLANIFIE',
      },
      data: { pointageActif: true },
    });
    return { updated: r.count };
  }
}
