import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
];

@Injectable()
export class FilieresService {
  constructor(private prisma: PrismaService) {}

  private async ensureFiliereNotLocked(id: string) {
    const f = await this.prisma.filiere.findUnique({ where: { id } });
    if (f?.verrouille)
      throw new ConflictException(
        'Cette filière est verrouillée et ne peut pas être modifiée',
      );
  }

  async findAll(includePending = false) {
    const where = includePending ? {} : { statut: 'APPROVED' };
    return this.prisma.filiere.findMany({
      where,
      include: {
        formations: {
          include: {
            semestres: {
              orderBy: { numero: 'asc' },
              include: { maquettes: { orderBy: { anneeRef: 'desc' } } },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.filiere.findUnique({
      where: { id },
      include: {
        formations: {
          include: {
            semestres: {
              orderBy: { numero: 'asc' },
              include: {
                maquettes: {
                  orderBy: { anneeRef: 'desc' },
                  include: {
                    semestre: { select: { id: true, numero: true } },
                    ues: { include: { ecs: true } },
                  },
                },
              },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });
    if (!f) throw new NotFoundException('Filière non trouvée');
    return f;
  }

  async create(
    data: { code: string; nom: string },
    ctx?: { userId: string; role: string },
  ) {
    const exists = await this.prisma.filiere.findUnique({
      where: { code: data.code },
    });
    if (exists) throw new ConflictException(`Le code ${data.code} existe déjà`);
    const isAdmin = ctx?.role && ADMIN_ROLES.includes(ctx.role);
    return this.prisma.filiere.create({
      data: {
        ...data,
        statut: isAdmin ? 'APPROVED' : 'PENDING',
        demandeurId: !isAdmin ? ctx?.userId : undefined,
      },
    });
  }

  async update(id: string, data: Partial<{ code: string; nom: string }>) {
    await this.ensureFiliereNotLocked(id);
    if (data.code) {
      const exists = await this.prisma.filiere.findFirst({
        where: { code: data.code, NOT: { id } },
      });
      if (exists)
        throw new ConflictException(`Le code ${data.code} existe déjà`);
    }
    return this.prisma.filiere.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.ensureFiliereNotLocked(id);
    return this.prisma.filiere.delete({ where: { id } });
  }

  async toggleVerrouille(id: string) {
    const f = await this.prisma.filiere.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Filière non trouvée');
    return this.prisma.filiere.update({
      where: { id },
      data: { verrouille: !f.verrouille },
    });
  }
}
