import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async findAll(exercice?: number) {
    const where = exercice ? { exercice } : {};
    return this.prisma.budget.findMany({
      where,
      orderBy: [{ exercice: 'desc' }, { departement: 'asc' }],
    });
  }

  async upsert(data: {
    exercice: number;
    departement: string;
    montantAlloue: number;
  }) {
    return this.prisma.budget.upsert({
      where: {
        exercice_departement: {
          exercice: data.exercice,
          departement: data.departement,
        },
      },
      create: data,
      update: { montantAlloue: data.montantAlloue },
    });
  }

  async findById(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });
    if (!budget) throw new NotFoundException('Budget non trouvé');
    return budget;
  }
}
