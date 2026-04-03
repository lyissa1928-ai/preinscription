export class AdmissionDocumentItemDto {
  code!: string;
  labelFr!: string;
  description?: string | null;
  category!: string;
  requirement!: 'REQUIRED' | 'OPTIONAL';
  attestationAcceptedInsteadOfDiploma!: boolean;
  contextualNote?: string;
}

/** Résolution CNI / passeport : jamais les deux obligatoires à la fois. */
export class IdentityDocumentResolutionDto {
  /** ONE_OF si la nationalité n’est pas fournie ; SINGLE si connue. */
  mode!: 'ONE_OF' | 'SINGLE';
  /** Si mode SINGLE : unique code exigé. */
  requiredCode?: 'CNI' | 'PASSEPORT';
  /** Si mode ONE_OF : le candidat doit fournir exactement une de ces pièces. */
  allowedCodes?: ('CNI' | 'PASSEPORT')[];
  labelFr!: string;
}

export class AdmissionRequiredDocumentsResponseDto {
  cycleCode!: string | null;
  formationId?: string;
  formationCode?: string;
  formationNom?: string;
  message?: string;
  required!: AdmissionDocumentItemDto[];
  optional!: AdmissionDocumentItemDto[];
  notes?: {
    /** Rappel métier : une seule pièce d’identité obligatoire (CNI ou passeport). */
    identityOneOf?: string;
    attestationInsteadOfDiploma?: string;
  };
  /** Présent si la logique identité est applicable pour ce cycle. */
  identityDocument?: IdentityDocumentResolutionDto;
}
