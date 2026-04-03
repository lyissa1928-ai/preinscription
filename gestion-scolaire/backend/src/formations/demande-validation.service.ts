import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EntityType =
  | 'FILIERE'
  | 'FORMATION'
  | 'SEMESTRE'
  | 'MAQUETTE'
  | 'UE';

@Injectable()
export class DemandeValidationService {
  constructor(private prisma: PrismaService) {}

  async findAllPending() {
    const [filieres, formations, semestres, maquettes, ues] = await Promise.all(
      [
        this.prisma.filiere.findMany({
          where: { statut: 'PENDING' },
          include: {
            demandeur: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.formation.findMany({
          where: { statut: 'PENDING' },
          include: {
            filiere: true,
            demandeur: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.semestre.findMany({
          where: { statut: 'PENDING' },
          include: {
            formation: { include: { filiere: true } },
            demandeur: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.maquette.findMany({
          where: { statutValidation: 'PENDING' },
          include: {
            semestre: {
              include: { formation: { include: { filiere: true } } },
            },
          },
        }),
        this.prisma.uE.findMany({
          where: { statutValidation: 'PENDING' },
          include: {
            maquette: {
              include: {
                semestre: {
                  include: { formation: { include: { filiere: true } } },
                },
              },
            },
          },
        }),
      ],
    );
    return {
      filieres,
      formations,
      semestres,
      maquettes,
      ues,
    };
  }

  async approveFiliere(id: string, adminUserId: string) {
    const f = await this.prisma.filiere.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Filière non trouvée');
    if (f.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.filiere.update({
      where: { id },
      data: {
        statut: 'APPROVED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async rejectFiliere(id: string, adminUserId: string) {
    const f = await this.prisma.filiere.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Filière non trouvée');
    if (f.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.filiere.update({
      where: { id },
      data: {
        statut: 'REJECTED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async approveFormation(id: string, adminUserId: string) {
    const f = await this.prisma.formation.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Formation non trouvée');
    if (f.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.formation.update({
      where: { id },
      data: {
        statut: 'APPROVED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async rejectFormation(id: string, adminUserId: string) {
    const f = await this.prisma.formation.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Formation non trouvée');
    if (f.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.formation.update({
      where: { id },
      data: {
        statut: 'REJECTED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async approveSemestre(id: string, adminUserId: string) {
    const s = await this.prisma.semestre.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Semestre non trouvé');
    if (s.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.semestre.update({
      where: { id },
      data: {
        statut: 'APPROVED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async rejectSemestre(id: string, adminUserId: string) {
    const s = await this.prisma.semestre.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Semestre non trouvé');
    if (s.statut !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.semestre.update({
      where: { id },
      data: {
        statut: 'REJECTED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async approveMaquette(id: string, adminUserId: string) {
    const m = await this.prisma.maquette.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Maquette non trouvée');
    if (m.statutValidation !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.maquette.update({
      where: { id },
      data: {
        statutValidation: 'APPROVED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async rejectMaquette(id: string, adminUserId: string) {
    const m = await this.prisma.maquette.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Maquette non trouvée');
    if (m.statutValidation !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.maquette.update({
      where: { id },
      data: {
        statutValidation: 'REJECTED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async approveUE(id: string, adminUserId: string) {
    const ue = await this.prisma.uE.findUnique({ where: { id } });
    if (!ue) throw new NotFoundException('UE non trouvée');
    if (ue.statutValidation !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.uE.update({
      where: { id },
      data: {
        statutValidation: 'APPROVED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }

  async rejectUE(id: string, adminUserId: string) {
    const ue = await this.prisma.uE.findUnique({ where: { id } });
    if (!ue) throw new NotFoundException('UE non trouvée');
    if (ue.statutValidation !== 'PENDING')
      throw new ConflictException('Cette demande a déjà été traitée');
    return this.prisma.uE.update({
      where: { id },
      data: {
        statutValidation: 'REJECTED',
        valideParId: adminUserId,
        dateValidation: new Date(),
      },
    });
  }
}
