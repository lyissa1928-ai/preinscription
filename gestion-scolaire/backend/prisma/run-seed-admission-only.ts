/** Exécute uniquement le seed des règles documentaires (sans toucher aux utilisateurs). */
import { PrismaClient } from '../generated/prisma-client';
import { seedAdmissionDocuments } from './seed-admission-documents';

const prisma = new PrismaClient();
seedAdmissionDocuments(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
