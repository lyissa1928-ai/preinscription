import { PrismaClient } from '../generated/prisma-client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { seedAdmissionDocuments } from './seed-admission-documents';

const prisma = new PrismaClient();

function hashDeviceToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

const ROLES = [
  'ADMIN',
  'SCOLARITE',
  'DEPT_HEAD',
  'TEACHER',
  'STUDENT',
  'AUDITOR',
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
  'SERVICE_PEDAGOGIQUE',
] as const;

async function main() {
  const deleted = await prisma.user.deleteMany({});
  console.log(`🗑️  ${deleted.count} utilisateur(s) supprimé(s)`);

  const passwordHash = await bcrypt.hash('password123', 10);
  const superAdminHash = await bcrypt.hash('passer123', 10);

  await prisma.user.upsert({
    where: { email: 'lyissa1928@gmail.com' },
    update: { role: 'SUPER_ADMIN', passwordHash: superAdminHash },
    create: {
      email: 'lyissa1928@gmail.com',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      firstName: 'Admin',
      lastName: 'Principal',
    },
  });

  // Utilisateur dédié Service Pédagogique
  await prisma.user.upsert({
    where: { email: 'mbeurgou.ndiaye@ucad.edu.sn' },
    update: { role: 'SERVICE_PEDAGOGIQUE', passwordHash },
    create: {
      email: 'mbeurgou.ndiaye@ucad.edu.sn',
      passwordHash,
      role: 'SERVICE_PEDAGOGIQUE',
      firstName: 'Mbeurgou',
      lastName: 'Ndiaye',
    },
  });

  // Compte Scolarité : fifi.LY@test.com / password123
  await prisma.user.upsert({
    where: { email: 'fifi.LY@test.com' },
    update: { role: 'SCOLARITE', passwordHash },
    create: {
      email: 'fifi.LY@test.com',
      passwordHash,
      role: 'SCOLARITE',
      firstName: 'Fifi',
      lastName: 'LY',
    },
  });
  console.log('   - fifi.LY@test.com / password123 (SCOLARITE)');

  for (const role of ROLES) {
    const email = `${role.toLowerCase()}@test.com`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        role,
        firstName: role.replace('_', ' '),
        lastName: 'Test',
      },
    });
  }

  // Filière → Formation → Semestre → Maquette → UE → EC
  const filiere = await prisma.filiere.upsert({
    where: { code: 'INFO' },
    update: {},
    create: { code: 'INFO', nom: 'Informatique' },
  });

  const formation = await prisma.formation.upsert({
    where: { filiereId_code: { filiereId: filiere.id, code: 'L-INFO' } },
    update: {},
    create: {
      filiereId: filiere.id,
      code: 'L-INFO',
      nom: 'Licence Informatique',
      cycle: 'L',
      dureeSemestres: 6,
    },
  });

  let semestre1 = await prisma.semestre.findFirst({
    where: { formationId: formation.id, numero: 1 },
  });
  if (!semestre1) {
    semestre1 = await prisma.semestre.create({
      data: { formationId: formation.id, numero: 1 },
    });
  }

  let maquette = await prisma.maquette.findFirst({
    where: { semestreId: semestre1.id, anneeRef: 2024 },
  });
  if (!maquette) {
    maquette = await prisma.maquette.create({
      data: {
        semestreId: semestre1.id,
        code: 'S1-2024',
        anneeRef: 2024,
      },
    });
  }

  const ue = await prisma.uE.findFirst({ where: { maquetteId: maquette.id } });
  if (!ue) {
    const newUe = await prisma.uE.create({
      data: { code: 'UE1', nom: 'Informatique fondamentale', maquetteId: maquette.id },
    });
    await prisma.eC.create({
      data: { code: 'EC1', nom: 'Algorithmique', ueId: newUe.id, vhCm: 20, vhTd: 20 },
    });
  }

  // Person + Teacher
  const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@test.com' } });
  if (teacherUser) {
    let teacherPerson = await prisma.person.findFirst({ where: { matricule: 'TCH-2024-0001' } });
    if (!teacherPerson) {
      teacherPerson = await prisma.person.create({
        data: { matricule: 'TCH-2024-0001', type: 'TEACHER', userId: teacherUser.id },
      });
      await prisma.teacher.create({
        data: { personId: teacherPerson.id, typeContrat: 'VACATAIRE' },
      });
    } else {
      await prisma.person.update({
        where: { id: teacherPerson.id },
        data: { userId: teacherUser.id },
      });
      const existingTeacher = await prisma.teacher.findFirst({ where: { personId: teacherPerson.id } });
      if (!existingTeacher) {
        await prisma.teacher.create({
          data: { personId: teacherPerson.id, typeContrat: 'VACATAIRE' },
        });
      }
    }
  }

  // Person + Student
  const studentUser = await prisma.user.findUnique({ where: { email: 'student@test.com' } });
  let studentPerson = await prisma.person.findFirst({ where: { matricule: 'STU-2024-0001' } });
  if (studentUser) {
    if (!studentPerson) {
      studentPerson = await prisma.person.create({
        data: { matricule: 'STU-2024-0001', type: 'STUDENT', userId: studentUser.id },
      });
    } else {
      await prisma.person.update({
        where: { id: studentPerson.id },
        data: { userId: studentUser.id },
      });
    }
  }

  const cohort = await prisma.cohort.findFirst({
    where: { formationId: formation.id, annee: 2024 },
  });
  if (!cohort) {
    await prisma.cohort.create({
      data: { nom: 'Promo 2024', formationId: formation.id, annee: 2024 },
    });
  }

  if (studentPerson) {
    const cohortForIns = await prisma.cohort.findFirst({ where: { formationId: formation.id, annee: 2024 } });
    const existingIns = await prisma.inscription.findUnique({
      where: { personId_anneeUniv: { personId: studentPerson.id, anneeUniv: 2024 } },
    });
    if (!existingIns && maquette) {
      await prisma.inscription.create({
        data: {
          personId: studentPerson.id,
          formationId: formation.id,
          maquetteId: maquette.id,
          semestreId: semestre1.id,
          cohortId: cohortForIns?.id,
          anneeUniv: 2024,
          statut: 'CONFIRMEE',
        },
      });
    }
  }

  await prisma.feeConfig.upsert({
    where: { formationId_anneeUniv: { formationId: formation.id, anneeUniv: 2024 } },
    update: {},
    create: {
      formationId: formation.id,
      anneeUniv: 2024,
      fraisInscription: 50000,
      mensualite: 25000,
      nbMois: 10,
      fraisSoutenanceL3: 75000,
      fraisSoutenanceM2: 100000,
    },
  });

  let salleAmphi = await prisma.salle.findFirst({ where: { nom: 'Amphi A' } });
  if (!salleAmphi) {
    salleAmphi = await prisma.salle.create({ data: { nom: 'Amphi A', capacite: 150, equipements: 'Vidéoprojecteur, micro' } });
  }
  let salle101 = await prisma.salle.findFirst({ where: { nom: 'Salle 101' } });
  if (!salle101) {
    salle101 = await prisma.salle.create({ data: { nom: 'Salle 101', capacite: 30, equipements: 'Tableau, PC' } });
  }

  const teacherRec = await prisma.teacher.findFirst({ where: { person: { userId: teacherUser?.id } } });
  const ecRec = await prisma.eC.findFirst({ where: { code: 'EC1' } });
  const salleRec = await prisma.salle.findFirst({ where: { nom: 'Salle 101' } });
  if (teacherRec && ecRec && salleRec) {
    const existingCourse = await prisma.course.findFirst({
      where: { ecId: ecRec.id, teacherId: teacherRec.id, anneeUniv: 2024 },
    });
    if (!existingCourse) {
      await prisma.course.create({
        data: {
          ecId: ecRec.id,
          teacherId: teacherRec.id,
          salleId: salleRec.id,
          jour: 1,
          heureDebut: 8,
          heureFin: 10,
          type: 'CM',
          anneeUniv: 2024,
        },
      });
    }
  }

  await prisma.sessionConfig.upsert({
    where: { anneeUniv_session: { anneeUniv: 2024, session: 1 } },
    update: {},
    create: { anneeUniv: 2024, session: 1, dateLimite: new Date('2025-01-31T23:59:59') },
  });
  await prisma.sessionConfig.upsert({
    where: { anneeUniv_session: { anneeUniv: 2024, session: 2 } },
    update: {},
    create: { anneeUniv: 2024, session: 2, dateLimite: new Date('2025-06-30T23:59:59') },
  });

  // Token device pour vigile/badge (dev et tests). En prod, créer des tokens dédiés.
  const devTokenPlain = process.env.DEVICE_TOKEN_PLAIN || 'dev-token-vigile-badge-12345';
  const devTokenHash = hashDeviceToken(devTokenPlain);
  await prisma.deviceToken.upsert({
    where: { tokenHash: devTokenHash },
    update: { isActive: true },
    create: { name: 'Dev/Kiosque', tokenHash: devTokenHash, isActive: true },
  });

  await seedAdmissionDocuments(prisma);

  console.log('✅ Seed terminé.');
  console.log('   - lyissa1928@gmail.com / passer123 (SUPER_ADMIN)');
  for (const role of ROLES) {
    console.log(`   - ${role.toLowerCase()}@test.com / password123 (${role})`);
  }
  console.log('   - X-DEVICE-TOKEN (vigile/badge): utiliser la valeur de DEVICE_TOKEN_PLAIN ou dev-token-vigile-badge-12345');
  console.log('   Filière INFO, formation L-INFO et salles créées.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
