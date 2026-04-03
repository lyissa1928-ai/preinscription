import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_COMPTES = [
  { numeroCompte: '512000', intitule: 'Trésorerie', type: 'DEBIT' },
  {
    numeroCompte: '706000',
    intitule: 'Prestations de services',
    type: 'CREDIT',
  },
  { numeroCompte: '601000', intitule: 'Achats', type: 'DEBIT' },
];

export async function seedPlanComptable(prisma: PrismaService) {
  for (const c of DEFAULT_COMPTES) {
    await prisma.compteComptable.upsert({
      where: { numeroCompte: c.numeroCompte },
      create: c,
      update: {},
    });
  }
}
