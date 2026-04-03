import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VigilanceService {
  constructor(private prisma: PrismaService) {}

  async getPresenceToday(type?: 'TEACHER' | 'STAFF' | 'all') {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const personTypes =
      type === 'all'
        ? ['TEACHER', 'STAFF']
        : type
          ? [type]
          : ['TEACHER', 'STAFF'];

    const persons = await this.prisma.person.findMany({
      where: { type: { in: personTypes } },
      include: {
        user: true,
        teacher: true,
      },
    });

    const presentIds = new Set(
      (
        await this.prisma.attendance.findMany({
          where: {
            date: { gte: todayStart, lt: todayEnd },
          },
          select: { personId: true },
        })
      ).map((a) => a.personId),
    );

    const result = persons.map((p) => ({
      personId: p.id,
      matricule: p.matricule,
      nom: p.user ? `${p.user.firstName} ${p.user.lastName}` : p.matricule,
      type: p.type,
      present: presentIds.has(p.id),
      heureArrivee: null as string | null,
    }));

    if (presentIds.size > 0) {
      const arrivals = await this.prisma.attendance.findMany({
        where: {
          date: { gte: todayStart, lt: todayEnd },
          personId: { in: Array.from(presentIds) },
        },
        orderBy: { heureArrivee: 'asc' },
        distinct: ['personId'],
        select: { personId: true, heureArrivee: true },
      });
      const arrivalMap = new Map(
        arrivals.map((a) => [a.personId, a.heureArrivee.toISOString()]),
      );
      for (const r of result) {
        if (r.present) {
          r.heureArrivee = arrivalMap.get(r.personId) ?? null;
        }
      }
    }

    const presentCount = result.filter((r) => r.present).length;
    const absentCount = result.length - presentCount;

    return {
      date: todayStart.toISOString().slice(0, 10),
      presentCount,
      absentCount,
      total: result.length,
      personnel: result.sort((a, b) => {
        if (a.present !== b.present) return a.present ? -1 : 1;
        return a.nom.localeCompare(b.nom);
      }),
    };
  }
}
