/**
 * Supprime toutes les filières (cascade : formations, semestres, maquettes, UE, EC, cohortes, inscriptions liées, etc.).
 *
 * ⚠️ DESTRUCTIF — à exécuter uniquement en connaissance de cause (reprise à zéro pédagogique).
 *
 * Usage (depuis backend/) : npx ts-node prisma/reset-filieres-formations.ts
 */
import { PrismaClient } from '../generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.filiere.count();
  const result = await prisma.filiere.deleteMany({});
  // eslint-disable-next-line no-console
  console.log(`Filières supprimées : ${result.count} (étaient ${n} avant suppression).`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
