import type { PrismaClient } from '../generated/prisma-client';

type Req = 'REQUIRED' | 'OPTIONAL';

const DOCUMENT_TYPES: Array<{
  code: string;
  labelFr: string;
  description?: string;
  category: string;
  attestationAcceptedInsteadOfDiploma?: boolean;
  sortOrder: number;
}> = [
  {
    code: 'CNI',
    labelFr: 'Carte nationale d’identité (CNI)',
    description:
      'CNI pour les candidats sénégalais — ne pas demander en parallèle le passeport comme obligatoire.',
    category: 'IDENTITY',
    sortOrder: 8,
  },
  {
    code: 'PASSEPORT',
    labelFr: 'Passeport',
    description:
      'Passeport pour les candidats étrangers — ne pas demander en parallèle la CNI comme obligatoire.',
    category: 'IDENTITY',
    sortOrder: 9,
  },
  {
    code: 'CARTE_SCOLAIRE',
    labelFr: 'Carte scolaire (facultatif)',
    description:
      'Complément possible pour les entrées BT1, BTS1, L1 uniquement — non exigée pour les niveaux supérieurs.',
    category: 'IDENTITY',
    sortOrder: 10,
  },
  {
    code: 'DIPLOME_BFEM',
    labelFr: 'Diplôme BFEM ou équivalent',
    category: 'ACADEMIC',
    sortOrder: 20,
  },
  {
    code: 'LETTRE_MOTIVATION',
    labelFr: 'Lettre de motivation',
    category: 'MOTIVATION',
    sortOrder: 90,
  },
  {
    code: 'RELEVE_BT1',
    labelFr: 'Relevé de notes BT1',
    category: 'ACADEMIC',
    sortOrder: 25,
  },
  {
    code: 'CERTIFICAT_SCOLARITE',
    labelFr: 'Certificat de scolarité',
    category: 'ACADEMIC',
    sortOrder: 30,
  },
  {
    code: 'RELEVE_BAC',
    labelFr: 'Relevé du baccalauréat',
    category: 'ACADEMIC',
    sortOrder: 35,
  },
  {
    code: 'BULLETINS_LYCEE',
    labelFr: 'Bulletins de Seconde, Première et Terminale',
    category: 'ACADEMIC',
    sortOrder: 40,
  },
  {
    code: 'DIPLOME_BAC_OU_ATTEST',
    labelFr: 'Diplôme du BAC ou attestation de réussite ou équivalent',
    description:
      'Si le diplôme définitif n’est pas encore disponible, une attestation de réussite peut être fournie.',
    category: 'ACADEMIC',
    attestationAcceptedInsteadOfDiploma: true,
    sortOrder: 45,
  },
  {
    code: 'RELEVES_BTS1',
    labelFr: 'Relevés de notes BTS1',
    category: 'ACADEMIC',
    sortOrder: 50,
  },
  {
    code: 'DIPLOME_BAC_EQUIV',
    labelFr: 'Diplôme du BAC ou équivalent',
    category: 'ACADEMIC',
    attestationAcceptedInsteadOfDiploma: true,
    sortOrder: 55,
  },
  {
    code: 'RELEVES_L1',
    labelFr: 'Relevés L1 (semestres 1 et 2)',
    category: 'ACADEMIC',
    sortOrder: 60,
  },
  {
    code: 'RELEVES_L1_L2',
    labelFr: 'Relevés L1 (S1 et S2) et L2 (S1 et S2)',
    category: 'ACADEMIC',
    sortOrder: 65,
  },
  {
    code: 'RELEVES_L1_L2_L3',
    labelFr: 'Relevés L1, L2 et L3',
    category: 'ACADEMIC',
    sortOrder: 70,
  },
  {
    code: 'DIPLOME_LICENCE_OU_ATTEST',
    labelFr: 'Diplôme de Licence ou attestation',
    category: 'ACADEMIC',
    attestationAcceptedInsteadOfDiploma: true,
    sortOrder: 75,
  },
  {
    code: 'CV',
    labelFr: 'Curriculum vitae (CV)',
    category: 'CV',
    sortOrder: 80,
  },
  {
    code: 'RELEVES_M1',
    labelFr: 'Relevés M1',
    category: 'ACADEMIC',
    sortOrder: 85,
  },
  {
    code: 'ATTESTATION_M1',
    labelFr: 'Attestation ou validation M1',
    category: 'ACADEMIC',
    sortOrder: 86,
  },
  {
    code: 'DIPLOME_LICENCE_EQUIV',
    labelFr: 'Diplôme de Licence ou équivalent',
    category: 'ACADEMIC',
    attestationAcceptedInsteadOfDiploma: true,
    sortOrder: 87,
  },
];

/** Règles par cycle : identité gérée par l’API (identityDocument), pas de lignes CNI+PASSEPORT en même temps. */
const RULES: Record<string, [string, Req, number][]> = {
  BT1: [
    ['CARTE_SCOLAIRE', 'OPTIONAL', 1],
    ['DIPLOME_BFEM', 'REQUIRED', 2],
    ['LETTRE_MOTIVATION', 'REQUIRED', 3],
  ],
  BT2: [
    ['RELEVE_BT1', 'REQUIRED', 1],
    ['CERTIFICAT_SCOLARITE', 'REQUIRED', 2],
    ['DIPLOME_BFEM', 'REQUIRED', 3],
    ['LETTRE_MOTIVATION', 'REQUIRED', 4],
  ],
  BTS1: [
    ['CARTE_SCOLAIRE', 'OPTIONAL', 1],
    ['RELEVE_BAC', 'REQUIRED', 2],
    ['BULLETINS_LYCEE', 'REQUIRED', 3],
    ['DIPLOME_BAC_OU_ATTEST', 'REQUIRED', 4],
    ['LETTRE_MOTIVATION', 'REQUIRED', 5],
  ],
  BTS2: [
    ['RELEVES_BTS1', 'REQUIRED', 1],
    ['CERTIFICAT_SCOLARITE', 'REQUIRED', 2],
    ['RELEVE_BAC', 'REQUIRED', 3],
    ['DIPLOME_BAC_EQUIV', 'REQUIRED', 4],
    ['LETTRE_MOTIVATION', 'REQUIRED', 5],
  ],
  L1: [
    ['CARTE_SCOLAIRE', 'OPTIONAL', 1],
    ['RELEVE_BAC', 'REQUIRED', 2],
    ['BULLETINS_LYCEE', 'REQUIRED', 3],
    ['DIPLOME_BAC_OU_ATTEST', 'REQUIRED', 4],
    ['LETTRE_MOTIVATION', 'REQUIRED', 5],
  ],
  L2: [
    ['RELEVES_L1', 'REQUIRED', 1],
    ['RELEVE_BAC', 'REQUIRED', 2],
    ['DIPLOME_BAC_EQUIV', 'REQUIRED', 3],
    ['LETTRE_MOTIVATION', 'REQUIRED', 4],
  ],
  L3: [
    ['RELEVES_L1_L2', 'REQUIRED', 1],
    ['RELEVE_BAC', 'REQUIRED', 2],
    ['DIPLOME_BAC_EQUIV', 'REQUIRED', 3],
    ['LETTRE_MOTIVATION', 'REQUIRED', 4],
  ],
  M1: [
    ['RELEVES_L1_L2_L3', 'REQUIRED', 1],
    ['DIPLOME_LICENCE_OU_ATTEST', 'REQUIRED', 2],
    ['CV', 'REQUIRED', 3],
    ['LETTRE_MOTIVATION', 'REQUIRED', 4],
  ],
  M2: [
    ['RELEVES_M1', 'REQUIRED', 1],
    ['ATTESTATION_M1', 'REQUIRED', 2],
    ['DIPLOME_LICENCE_EQUIV', 'REQUIRED', 3],
    ['CV', 'REQUIRED', 4],
    ['LETTRE_MOTIVATION', 'REQUIRED', 5],
  ],
};

export async function seedAdmissionDocuments(prisma: PrismaClient): Promise<void> {
  for (const dt of DOCUMENT_TYPES) {
    await prisma.admissionDocumentType.upsert({
      where: { code: dt.code },
      create: {
        code: dt.code,
        labelFr: dt.labelFr,
        description: dt.description ?? null,
        category: dt.category,
        attestationAcceptedInsteadOfDiploma:
          dt.attestationAcceptedInsteadOfDiploma ?? false,
        sortOrder: dt.sortOrder,
      },
      update: {
        labelFr: dt.labelFr,
        description: dt.description ?? null,
        category: dt.category,
        attestationAcceptedInsteadOfDiploma:
          dt.attestationAcceptedInsteadOfDiploma ?? false,
        sortOrder: dt.sortOrder,
      },
    });
  }

  const legacy = await prisma.admissionDocumentType.findUnique({
    where: { code: 'PIECE_IDENTITE' },
  });
  if (legacy) {
    await prisma.admissionCycleDocumentRule.deleteMany({
      where: { documentTypeId: legacy.id },
    });
  }

  const codeToId = new Map<string, string>();
  const all = await prisma.admissionDocumentType.findMany({
    select: { id: true, code: true },
  });
  for (const row of all) {
    codeToId.set(row.code, row.id);
  }

  for (const [cycleCode, rows] of Object.entries(RULES)) {
    for (const [docCode, requirement, sortOrder] of rows) {
      const documentTypeId = codeToId.get(docCode);
      if (!documentTypeId) {
        console.warn(`[seed admission] type manquant: ${docCode}`);
        continue;
      }
      await prisma.admissionCycleDocumentRule.upsert({
        where: {
          cycleCode_documentTypeId: { cycleCode, documentTypeId },
        },
        create: {
          cycleCode,
          documentTypeId,
          requirement,
          sortOrder,
        },
        update: {
          requirement,
          sortOrder,
        },
      });
    }
  }

  console.log(
    '   [admission] Types et règles documentaires (cycles BT1…M2) : OK (upsert).',
  );
}
