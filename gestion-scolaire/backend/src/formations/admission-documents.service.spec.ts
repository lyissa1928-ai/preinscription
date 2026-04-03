import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdmissionDocumentsService } from './admission-documents.service';
import { PrismaService } from '../prisma/prisma.service';

function mockDocType(over: Partial<{
  code: string;
  labelFr: string;
  category: string;
  attestationAcceptedInsteadOfDiploma: boolean;
}>) {
  return {
    code: over.code ?? 'X',
    labelFr: over.labelFr ?? 'Libellé',
    description: null,
    category: over.category ?? 'OTHER',
    attestationAcceptedInsteadOfDiploma:
      over.attestationAcceptedInsteadOfDiploma ?? false,
  };
}

describe('AdmissionDocumentsService', () => {
  let service: AdmissionDocumentsService;
  const mockPrisma = {
    formation: { findUnique: jest.fn() },
    admissionCycleDocumentRule: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdmissionDocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = moduleRef.get(AdmissionDocumentsService);
    jest.clearAllMocks();
  });

  const cycles = [
    'BT1',
    'BT2',
    'BTS1',
    'BTS2',
    'L1',
    'L2',
    'L3',
    'M1',
    'M2',
  ] as const;

  it.each(cycles)(
    'cycle %s : exclut PIECE_IDENTITE / CNI / PASSEPORT des lignes (identité via identityDocument)',
    async (cycle) => {
      mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([
        {
          requirement: 'REQUIRED',
          sortOrder: 1,
          documentType: mockDocType({
            code: 'PIECE_IDENTITE',
            category: 'IDENTITY',
          }),
        },
        {
          requirement: 'REQUIRED',
          sortOrder: 2,
          documentType: mockDocType({
            code: 'DIPLOME_BFEM',
            category: 'ACADEMIC',
          }),
        },
      ]);
      const res = await service.getRequiredDocuments({ cycleCode: cycle });
      expect(res.cycleCode).toBe(cycle);
      expect(res.required.map((r) => r.code)).toEqual(['DIPLOME_BFEM']);
      expect(res.identityDocument?.mode).toBe('ONE_OF');
      expect(res.identityDocument?.allowedCodes).toEqual(['CNI', 'PASSEPORT']);
    },
  );

  it('national connu : identityDocument SINGLE CNI', async () => {
    mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([
      {
        requirement: 'REQUIRED',
        sortOrder: 1,
        documentType: mockDocType({ code: 'DIPLOME_BFEM', category: 'ACADEMIC' }),
      },
    ]);
    const res = await service.getRequiredDocuments({
      cycleCode: 'BT1',
      isForeigner: false,
    });
    expect(res.identityDocument?.mode).toBe('SINGLE');
    expect(res.identityDocument?.requiredCode).toBe('CNI');
  });

  it('étranger : identityDocument SINGLE PASSEPORT', async () => {
    mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([
      {
        requirement: 'REQUIRED',
        sortOrder: 1,
        documentType: mockDocType({ code: 'DIPLOME_BFEM', category: 'ACADEMIC' }),
      },
    ]);
    const res = await service.getRequiredDocuments({
      cycleCode: 'L2',
      isForeigner: true,
    });
    expect(res.identityDocument?.mode).toBe('SINGLE');
    expect(res.identityDocument?.requiredCode).toBe('PASSEPORT');
  });

  it('BT1 : OPTIONAL carte scolaire en base + REQUIRED académique', async () => {
    mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([
      {
        requirement: 'OPTIONAL',
        sortOrder: 1,
        documentType: mockDocType({
          code: 'CARTE_SCOLAIRE',
          category: 'IDENTITY',
        }),
      },
      {
        requirement: 'REQUIRED',
        sortOrder: 2,
        documentType: mockDocType({ code: 'DIPLOME_BFEM', category: 'ACADEMIC' }),
      },
    ]);
    const res = await service.getRequiredDocuments({ cycleCode: 'BT1' });
    expect(res.required.map((r) => r.code)).toEqual(['DIPLOME_BFEM']);
    expect(res.optional.map((r) => r.code)).toEqual(['CARTE_SCOLAIRE']);
  });

  it('L2 : pas de carte scolaire dans les règles mock (uniquement relevés)', async () => {
    mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([
      {
        requirement: 'REQUIRED',
        sortOrder: 1,
        documentType: mockDocType({ code: 'RELEVES_L1', category: 'ACADEMIC' }),
      },
    ]);
    const res = await service.getRequiredDocuments({ cycleCode: 'L2' });
    expect(res.optional.some((o) => o.code === 'CARTE_SCOLAIRE')).toBe(false);
  });

  it('sans configuration en base : message explicite + identityDocument', async () => {
    mockPrisma.admissionCycleDocumentRule.findMany.mockResolvedValue([]);
    const res = await service.getRequiredDocuments({ cycleCode: 'L2' });
    expect(res.required).toEqual([]);
    expect(res.message).toContain('Aucune règle');
    expect(res.identityDocument?.mode).toBe('ONE_OF');
  });

  it('sans cycle : message si formation sans admissionCycleCode', async () => {
    mockPrisma.formation.findUnique.mockResolvedValue({
      id: 'f1',
      code: 'X',
      nom: 'Y',
      admissionCycleCode: null,
    });
    const res = await service.getRequiredDocuments({ formationId: 'f1' });
    expect(res.cycleCode).toBeNull();
    expect(res.message).toContain('cycle');
    expect(res.identityDocument).toBeUndefined();
  });

  it('formation inconnue : NotFoundException', async () => {
    mockPrisma.formation.findUnique.mockResolvedValue(null);
    await expect(
      service.getRequiredDocuments({ formationId: 'bad' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('pas de cycle résolu : non bloquant', async () => {
    const res = await service.getRequiredDocuments({});
    expect(res.cycleCode).toBeNull();
    expect(res.required).toEqual([]);
    expect(res.message).toBeDefined();
  });

  it('cycleHasOptionalCarteScolaire : BT1 oui, L2 non', () => {
    expect(service.cycleHasOptionalCarteScolaire('BT1')).toBe(true);
    expect(service.cycleHasOptionalCarteScolaire('L2')).toBe(false);
  });
});
