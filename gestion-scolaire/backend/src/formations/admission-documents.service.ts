import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMISSION_CYCLE_CODES,
  ADMISSION_DOCUMENT_GLOBAL_NOTES,
  CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE,
  isAdmissionCycleCode,
} from './admission-documents.constants';
import type {
  AdmissionDocumentItemDto,
  AdmissionRequiredDocumentsResponseDto,
  IdentityDocumentResolutionDto,
} from './dto/admission-required-documents.response.dto';

@Injectable()
export class AdmissionDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  getSupportedCycleCodes(): readonly string[] {
    return ADMISSION_CYCLE_CODES;
  }

  /**
   * Résout les pièces attendues pour un cycle d’admission (BT1 … M2).
   * Identité : CNI ou passeport selon `isForeigner` ; si non fourni, mode ONE_OF.
   * Carte scolaire : uniquement optionnelle pour BT1, BTS1, L1 (seed).
   */
  async getRequiredDocuments(params: {
    cycleCode?: string;
    formationId?: string;
    isForeigner?: boolean;
  }): Promise<AdmissionRequiredDocumentsResponseDto> {
    let cycle: string | null = params.cycleCode?.trim() ?? null;
    let formationMeta:
      | { id: string; code: string; nom: string; admissionCycleCode: string | null }
      | undefined;

    if (params.formationId?.trim()) {
      const f = await this.prisma.formation.findUnique({
        where: { id: params.formationId.trim() },
        select: {
          id: true,
          code: true,
          nom: true,
          admissionCycleCode: true,
        },
      });
      if (!f) {
        throw new NotFoundException('Formation non trouvée.');
      }
      formationMeta = f;
      if (!cycle) {
        cycle = f.admissionCycleCode?.trim().toUpperCase() ?? null;
      }
    }

    if (cycle && !isAdmissionCycleCode(cycle)) {
      throw new BadRequestException({
        message: `Cycle d'admission inconnu : "${cycle}".`,
        supportedCycles: [...ADMISSION_CYCLE_CODES],
      });
    }

    const notes: AdmissionRequiredDocumentsResponseDto['notes'] = {
      attestationInsteadOfDiploma:
        ADMISSION_DOCUMENT_GLOBAL_NOTES.attestationInsteadOfDiploma,
    };

    if (!cycle) {
      return {
        cycleCode: null,
        formationId: formationMeta?.id,
        formationCode: formationMeta?.code,
        formationNom: formationMeta?.nom,
        message:
          "Aucun cycle d'admission n'a pu être déterminé. Fournissez le paramètre cycleCode (ex. L2) ou renseignez admissionCycleCode sur la formation.",
        required: [],
        optional: [],
        notes,
      };
    }

    const rules = await this.prisma.admissionCycleDocumentRule.findMany({
      where: { cycleCode: cycle },
      include: { documentType: true },
      orderBy: [{ sortOrder: 'asc' }, { documentType: { sortOrder: 'asc' } }],
    });

    if (rules.length === 0) {
      notes.identityOneOf = ADMISSION_DOCUMENT_GLOBAL_NOTES.identityOneOf;
      return {
        cycleCode: cycle,
        formationId: formationMeta?.id,
        formationCode: formationMeta?.code,
        formationNom: formationMeta?.nom,
        message:
          'Aucune règle documentaire n’est encore configurée en base pour ce cycle. Contactez l’administration ou exécutez le seed des règles d’admission.',
        required: [],
        optional: [],
        notes,
        identityDocument: this.resolveIdentityDocument(
          cycle,
          params.isForeigner,
        ),
      };
    }

    const required: AdmissionDocumentItemDto[] = [];
    const optional: AdmissionDocumentItemDto[] = [];

    const toItem = (r: (typeof rules)[0]): AdmissionDocumentItemDto => {
      const dt = r.documentType;
      return {
        code: dt.code,
        labelFr: dt.labelFr,
        description: dt.description,
        category: dt.category,
        requirement: r.requirement as 'REQUIRED' | 'OPTIONAL',
        attestationAcceptedInsteadOfDiploma:
          dt.attestationAcceptedInsteadOfDiploma,
      };
    };

    for (const r of rules) {
      const code = r.documentType.code;
      // Ancien référentiel unifié : retiré au profit de CNI / PASSEPORT (voir identityDocument).
      if (code === 'PIECE_IDENTITE') continue;
      if (code === 'CNI' || code === 'PASSEPORT') continue;

      const item = toItem(r);
      if (r.requirement === 'OPTIONAL') {
        optional.push(item);
      } else {
        required.push(item);
      }
    }

    const identityDocument = this.resolveIdentityDocument(
      cycle,
      params.isForeigner,
    );

    notes.identityOneOf = ADMISSION_DOCUMENT_GLOBAL_NOTES.identityOneOf;

    return {
      cycleCode: cycle,
      formationId: formationMeta?.id,
      formationCode: formationMeta?.code,
      formationNom: formationMeta?.nom,
      required,
      optional,
      notes,
      identityDocument,
    };
  }

  private resolveIdentityDocument(
    _cycle: string,
    isForeigner: boolean | undefined,
  ): IdentityDocumentResolutionDto {
    const labelBase =
      'Pièce d’identité : CNI (candidat sénégalais) ou passeport (candidat étranger) — une seule pièce obligatoire.';

    if (isForeigner === true) {
      return {
        mode: 'SINGLE',
        requiredCode: 'PASSEPORT',
        labelFr: `${labelBase} (profil : étranger — passeport attendu.)`,
      };
    }
    if (isForeigner === false) {
      return {
        mode: 'SINGLE',
        requiredCode: 'CNI',
        labelFr: `${labelBase} (profil : national — CNI attendue.)`,
      };
    }
    return {
      mode: 'ONE_OF',
      allowedCodes: ['CNI', 'PASSEPORT'],
      labelFr: `${labelBase} Indiquez votre nationalité côté formulaire pour afficher la pièce unique attendue.`,
    };
  }

  /** Utilitaire : le cycle prévoit-il une carte scolaire optionnelle ? */
  cycleHasOptionalCarteScolaire(cycle: string): boolean {
    return (CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE as readonly string[]).includes(
      cycle,
    );
  }
}
