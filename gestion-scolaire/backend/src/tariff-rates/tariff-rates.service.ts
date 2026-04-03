import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TariffRatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(formationId?: string) {
    const where = formationId ? { formationId } : {};
    return this.prisma.tariffRate.findMany({
      where,
      orderBy: [{ formationId: 'asc' }, { dateEffet: 'desc' }],
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.tariffRate.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Taux horaire non trouvé');
    return r;
  }

  async create(data: {
    formationId?: string;
    ecId?: string;
    tauxCm?: number;
    tauxTd?: number;
    tauxTp?: number;
    tauxTpe?: number;
  }) {
    return this.prisma.tariffRate.create({
      data: {
        formationId: data.formationId ?? null,
        ecId: data.ecId ?? null,
        tauxCm: data.tauxCm ?? 0,
        tauxTd: data.tauxTd ?? 0,
        tauxTp: data.tauxTp ?? 0,
        tauxTpe: data.tauxTpe ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: {
      ecId?: string | null;
      tauxCm?: number;
      tauxTd?: number;
      tauxTp?: number;
      tauxTpe?: number;
    },
  ) {
    await this.findOne(id);
    return this.prisma.tariffRate.update({
      where: { id },
      data: {
        ...(data.ecId !== undefined && { ecId: data.ecId }),
        ...(data.tauxCm != null && { tauxCm: data.tauxCm }),
        ...(data.tauxTd != null && { tauxTd: data.tauxTd }),
        ...(data.tauxTp != null && { tauxTp: data.tauxTp }),
        ...(data.tauxTpe != null && { tauxTpe: data.tauxTpe }),
      },
    });
  }
}
