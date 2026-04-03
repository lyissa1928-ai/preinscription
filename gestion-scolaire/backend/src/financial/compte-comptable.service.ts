import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompteComptableService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.compteComptable.findMany({
      orderBy: { numeroCompte: 'asc' },
    });
  }

  async create(data: { numeroCompte: string; intitule: string; type: string }) {
    const existing = await this.prisma.compteComptable.findUnique({
      where: { numeroCompte: data.numeroCompte },
    });
    if (existing)
      throw new ConflictException('Ce numéro de compte existe déjà');

    return this.prisma.compteComptable.create({
      data: {
        numeroCompte: data.numeroCompte,
        intitule: data.intitule,
        type: data.type,
      },
    });
  }

  async findById(id: string) {
    const compte = await this.prisma.compteComptable.findUnique({
      where: { id },
    });
    if (!compte) throw new NotFoundException('Compte non trouvé');
    return compte;
  }
}
