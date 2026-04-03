import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EncadrementsService {
  constructor(private prisma: PrismaService) {}

  /** Liste des encadrements (thèses, mémoires, projets) de l'enseignant connecté. */
  async findMyEncadrements(userId: string) {
    const person = await this.prisma.person.findFirst({
      where: { userId, type: 'TEACHER' },
      include: { teacher: true },
    });
    if (!person?.teacher) return [];
    return this.prisma.encadrement.findMany({
      where: { teacherId: person.teacher.id },
      include: {
        person: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            student: { select: { numeroCarteEtudiant: true } },
          },
        },
      },
      orderBy: [{ anneeUniv: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
