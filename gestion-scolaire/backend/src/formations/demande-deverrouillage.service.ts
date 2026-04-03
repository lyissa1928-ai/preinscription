import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemandeDeverrouillageService {
  constructor(private prisma: PrismaService) {}

  async create(maquetteId: string, userId: string, motif?: string) {
    const maquette = await this.prisma.maquette.findUnique({
      where: { id: maquetteId },
    });
    if (!maquette) throw new NotFoundException('Maquette non trouvée');
    if (!maquette.verrouille)
      throw new ConflictException("Cette maquette n'est pas verrouillée");

    const pending = await this.prisma.demandeDeverrouillageMaquette.findFirst({
      where: { maquetteId, demandeurId: userId, statut: 'PENDING' },
    });
    if (pending)
      throw new ConflictException(
        'Vous avez déjà une demande en attente pour cette maquette',
      );

    return this.prisma.demandeDeverrouillageMaquette.create({
      data: { maquetteId, demandeurId: userId, motif },
      include: {
        maquette: {
          include: {
            semestre: {
              include: { formation: { include: { filiere: true } } },
            },
          },
        },
        demandeur: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAllPending() {
    return this.prisma.demandeDeverrouillageMaquette.findMany({
      where: { statut: 'PENDING' },
      include: {
        maquette: {
          include: {
            semestre: {
              include: { formation: { include: { filiere: true } } },
            },
          },
        },
        demandeur: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByMaquette(maquetteId: string) {
    return this.prisma.demandeDeverrouillageMaquette.findMany({
      where: { maquetteId },
      include: {
        demandeur: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        traitePar: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, adminUserId: string) {
    const demande = await this.prisma.demandeDeverrouillageMaquette.findUnique({
      where: { id },
      include: { maquette: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');
    if (demande.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');

    await this.prisma.$transaction([
      this.prisma.maquette.update({
        where: { id: demande.maquetteId },
        data: { verrouille: false },
      }),
      this.prisma.demandeDeverrouillageMaquette.update({
        where: { id },
        data: {
          statut: 'APPROVED',
          traiteParId: adminUserId,
          dateTraitement: new Date(),
        },
      }),
    ]);

    return this.prisma.demandeDeverrouillageMaquette.findUnique({
      where: { id },
      include: {
        maquette: true,
        demandeur: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  async reject(id: string, adminUserId: string) {
    const demande = await this.prisma.demandeDeverrouillageMaquette.findUnique({
      where: { id },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');
    if (demande.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');

    return this.prisma.demandeDeverrouillageMaquette.update({
      where: { id },
      data: {
        statut: 'REJECTED',
        traiteParId: adminUserId,
        dateTraitement: new Date(),
      },
      include: {
        maquette: true,
        demandeur: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }
}
