/**
 * Référentiel pièces à fournir par niveau (validation serveur).
 * Identité : CNI (national) ou passeport (étranger), jamais les deux obligatoires ;
 * carte scolaire hors identité, optionnelle BT1 / BTS1 / L1 uniquement.
 */

/** @typedef {'bt1'|'bt2'|'bts1'|'bts2'|'l1'|'l2'|'l3'|'m1'|'m2'|'generic'} PreinscriptionNiveauKey */

const TEXT_BT1 =
  'BT1 — CNI (national) ou passeport (étranger), une seule obligatoire ; carte scolaire facultative ; diplôme BFEM ; lettre de motivation.';

const TEXT_BT2 =
  'BT2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevé BT1 ; certificat de scolarité ; diplôme BFEM ; lettre de motivation.';

const TEXT_BTS1 =
  'BTS1 — CNI ou passeport selon nationalité ; carte scolaire facultative ; relevé BAC ; bulletins Seconde à Terminale ; diplôme BAC ou attestation ; lettre de motivation.';

const TEXT_BTS2 =
  'BTS2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés BTS1 ; certificat de scolarité ; relevé BAC ; diplôme BAC ou équivalent ; lettre de motivation.';

const TEXT_L1 =
  'L1 — CNI ou passeport selon nationalité ; carte scolaire facultative ; relevé BAC ; bulletins Seconde à Terminale ; diplôme BAC ou attestation ; lettre de motivation.';

const TEXT_L2 =
  'L2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1 ; relevé BAC ; diplôme BAC ; lettre de motivation.';

const TEXT_L3 =
  'L3 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1 et L2 ; relevé BAC ; diplôme BAC ; lettre de motivation.';

const TEXT_M1 =
  'M1 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1–L3 ; diplôme Licence ou attestation ; CV ; lettre de motivation.';

const TEXT_M2 =
  'M2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés M1 ; attestation M1 ; diplôme Licence ; CV ; lettre de motivation.';

const TEXT_GENERIC =
  'Pièce d’identité : CNI ou passeport (une seule selon nationalité) ; diplôme et relevé du dernier niveau ; lettre de motivation.';

const CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE = ['bt1', 'bts1', 'l1'];

/** Champs fichiers acceptés par multer pour POST /api/etudiant/dossier */
const DOSSIER_UPLOAD_FIELD_NAMES = [
  'piece_identite',
  'carte_scolaire',
  'carte_scolaire_terminale',
  'passeport',
  'diplome_bfem',
  'releve_bt1',
  'certificat_scolarite_annee_precedente',
  'releve_bac',
  'bulletin_seconde',
  'bulletin_premiere',
  'bulletin_terminale',
  'diplome_bac',
  'releve_l1_s1',
  'releve_l1_s2',
  'releve_l2_s1',
  'releve_l2_s2',
  'releve_l3_s1',
  'releve_l3_s2',
  'diplome_licence3_ou_attestation',
  'copie_diplome_licence',
  'attestation_reussite_licence',
  'attestation_m1',
  'releve_m1_s1',
  'releve_m1_s2',
  'cv',
  'lettre_motivation',
  'photo',
  'diplome',
  'releve_notes',
  'releve_l1',
  'releve_l2',
  'releve_l3',
  'copie_licence3',
  'copie_master1',
];

function inferIsForeignerFromNationalite(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return undefined;
  if (/^(sn|sen|senegal|sénégal)$/.test(s)) return false;
  if (/\bsenegal\b|\bsénégal\b/.test(s)) return false;
  if (/\bsenegalais\b|\bsénégalais\b|\bsenegalaise\b|\bsénégalaise\b/.test(s)) return false;
  return true;
}

function normalizePreinscriptionNiveau(niveau) {
  const s = String(niveau || '')
    .trim()
    .toLowerCase();
  if (!s) return 'generic';

  if (/\bbts\s*2\b|^bts2$|bts\s*ii\b/.test(s)) return 'bts2';
  if (/\bbts\s*1\b|^bts1$|bts\s*i\b/.test(s)) return 'bts1';

  if (/\bbt\s*2\b|brevet\s+technicien\s*2|bt\s*ii\b|^bt2$/.test(s)) return 'bt2';
  if (/\bbt\s*1\b|brevet\s+technicien\s*1|bt\s*i\b|^bt1$/.test(s)) return 'bt1';

  if (/\bm2\b|master\s*2/.test(s)) return 'm2';
  if (/\bm1\b|master\s*1/.test(s)) return 'm1';

  if (/licence\s*3|^l3$/.test(s)) return 'l3';
  if (/licence\s*2|^l2$/.test(s)) return 'l2';

  if (
    /^l1$/.test(s) ||
    /1ère\s*année|1ere\s*année|première\s*année|premiere\s*année/.test(s) ||
    /licence\s*1\b/.test(s) ||
    /bac\+1/.test(s) ||
    /terminale\s*\/\s*bac/.test(s)
  ) {
    return 'l1';
  }

  return 'generic';
}

function hasFile(reqFiles, field) {
  return !!(reqFiles && reqFiles[field] && reqFiles[field][0]);
}

/**
 * Identité satisfaite si la pièce attendue selon la nationalité est fournie (carte scolaire ne compte pas).
 */
function hasRequiredIdentity(reqFiles, nationalite) {
  const isForeign = inferIsForeignerFromNationalite(nationalite);
  if (isForeign === true) return hasFile(reqFiles, 'passeport');
  if (isForeign === false) return hasFile(reqFiles, 'piece_identite');
  return hasFile(reqFiles, 'piece_identite') || hasFile(reqFiles, 'passeport');
}

const LEVEL_KEYS = [
  'bt1',
  'bt2',
  'bts1',
  'bts2',
  'l1',
  'l2',
  'l3',
  'm1',
  'm2',
  'generic',
];

/**
 * @returns {{ ok: boolean, missingKeys: string[], message?: string }}
 */
function validateDossierUploadsForNiveau(reqFiles, niveauKey, nationalite) {
  const key = LEVEL_KEYS.includes(niveauKey) ? niveauKey : 'generic';
  const missing = [];

  const need = (field) => {
    if (!hasFile(reqFiles, field)) missing.push(field);
  };

  if (!hasRequiredIdentity(reqFiles, nationalite)) {
    missing.push('identite_ou_passeport');
  }

  if (key === 'bt1') {
    need('diplome_bfem');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'bt2') {
    need('releve_bt1');
    need('certificat_scolarite_annee_precedente');
    need('diplome_bfem');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'bts1') {
    need('releve_bac');
    need('bulletin_seconde');
    need('bulletin_premiere');
    need('bulletin_terminale');
    need('diplome_bac');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'bts2') {
    need('releve_bt1');
    need('certificat_scolarite_annee_precedente');
    need('releve_bac');
    need('diplome_bac');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'l1') {
    need('releve_bac');
    need('bulletin_seconde');
    need('bulletin_premiere');
    need('bulletin_terminale');
    need('diplome_bac');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'l2') {
    need('releve_l1_s1');
    need('releve_l1_s2');
    need('releve_bac');
    need('diplome_bac');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'l3') {
    need('releve_l1_s1');
    need('releve_l1_s2');
    need('releve_l2_s1');
    need('releve_l2_s2');
    need('releve_bac');
    need('diplome_bac');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'm1') {
    need('releve_l1_s1');
    need('releve_l1_s2');
    need('releve_l2_s1');
    need('releve_l2_s2');
    need('releve_l3_s1');
    need('releve_l3_s2');
    need('diplome_licence3_ou_attestation');
    need('cv');
    need('lettre_motivation');
    return finish(missing);
  }

  if (key === 'm2') {
    need('copie_diplome_licence');
    need('attestation_reussite_licence');
    need('attestation_m1');
    need('releve_m1_s1');
    need('releve_m1_s2');
    need('cv');
    need('lettre_motivation');
    return finish(missing);
  }

  need('diplome');
  need('releve_notes');
  need('lettre_motivation');
  return finish(missing);
}

function finish(missing) {
  if (missing.length > 0) {
    return {
      ok: false,
      missingKeys: missing,
      message:
        'Dossier incomplet : pièces manquantes pour le niveau de préinscription sélectionné.',
    };
  }
  return { ok: true, missingKeys: [] };
}

function getInfoParagraphsForNiveauKey(niveauKey) {
  const k = LEVEL_KEYS.includes(niveauKey) ? niveauKey : 'generic';
  const map = {
    bt1: [TEXT_BT1],
    bt2: [TEXT_BT2],
    bts1: [TEXT_BTS1],
    bts2: [TEXT_BTS2],
    l1: [TEXT_L1],
    l2: [TEXT_L2],
    l3: [TEXT_L3],
    m1: [TEXT_M1],
    m2: [TEXT_M2],
    generic: [TEXT_GENERIC],
  };
  return map[k] || [TEXT_GENERIC];
}

function identityKeysForChecklist(nationalite) {
  const isF = inferIsForeignerFromNationalite(nationalite);
  if (isF === true) return ['passeport'];
  if (isF === false) return ['piece_identite'];
  return ['piece_identite', 'passeport'];
}

function optionalCarteKeysForNiveau(niveauKey) {
  return CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE.includes(niveauKey)
    ? ['carte_scolaire', 'carte_scolaire_terminale']
    : [];
}

/**
 * @returns {{ required: string[], identityKeys: string[], optionalCarteKeys: string[] }}
 */
function getDocumentChecklistDefinition(niveauKey, nationalite) {
  const k = LEVEL_KEYS.includes(niveauKey) ? niveauKey : 'generic';
  const nat = nationalite == null ? '' : String(nationalite);
  const identityKeys = identityKeysForChecklist(nat);
  const optionalCarteKeys = optionalCarteKeysForNiveau(k);

  const defs = {
    bt1: { required: ['diplome_bfem', 'lettre_motivation'], identityKeys, optionalCarteKeys },
    bt2: {
      required: [
        'releve_bt1',
        'certificat_scolarite_annee_precedente',
        'diplome_bfem',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys: [],
    },
    bts1: {
      required: [
        'releve_bac',
        'bulletin_seconde',
        'bulletin_premiere',
        'bulletin_terminale',
        'diplome_bac',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys,
    },
    bts2: {
      required: [
        'releve_bt1',
        'certificat_scolarite_annee_precedente',
        'releve_bac',
        'diplome_bac',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys: [],
    },
    l1: {
      required: [
        'releve_bac',
        'bulletin_seconde',
        'bulletin_premiere',
        'bulletin_terminale',
        'diplome_bac',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys,
    },
    l2: {
      required: ['releve_l1_s1', 'releve_l1_s2', 'releve_bac', 'diplome_bac', 'lettre_motivation'],
      identityKeys,
      optionalCarteKeys: [],
    },
    l3: {
      required: [
        'releve_l1_s1',
        'releve_l1_s2',
        'releve_l2_s1',
        'releve_l2_s2',
        'releve_bac',
        'diplome_bac',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys: [],
    },
    m1: {
      required: [
        'releve_l1_s1',
        'releve_l1_s2',
        'releve_l2_s1',
        'releve_l2_s2',
        'releve_l3_s1',
        'releve_l3_s2',
        'diplome_licence3_ou_attestation',
        'cv',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys: [],
    },
    m2: {
      required: [
        'copie_diplome_licence',
        'attestation_reussite_licence',
        'attestation_m1',
        'releve_m1_s1',
        'releve_m1_s2',
        'cv',
        'lettre_motivation',
      ],
      identityKeys,
      optionalCarteKeys: [],
    },
    generic: { required: ['diplome', 'releve_notes', 'lettre_motivation'], identityKeys, optionalCarteKeys: [] },
  };
  return defs[k] || defs.generic;
}

function computeMissingDocumentTypes(documents, niveauKey, nationalite) {
  const nat = nationalite == null ? '' : String(nationalite);
  const { required, identityKeys } = getDocumentChecklistDefinition(niveauKey, nat);
  const types = new Set((documents || []).map((d) => d.type_document));
  const missing = [];
  for (const r of required) {
    if (!types.has(r)) missing.push(r);
  }
  if (!identityKeys.some((k) => types.has(k))) {
    missing.push('identite_ou_passeport');
  }
  return missing;
}

module.exports = {
  TEXT_BT1,
  TEXT_BT2,
  TEXT_BTS1,
  TEXT_BTS2,
  TEXT_L1,
  TEXT_L2,
  TEXT_L3,
  TEXT_M1,
  TEXT_M2,
  TEXT_GENERIC,
  DOSSIER_UPLOAD_FIELD_NAMES,
  normalizePreinscriptionNiveau,
  validateDossierUploadsForNiveau,
  getInfoParagraphsForNiveauKey,
  getDocumentChecklistDefinition,
  computeMissingDocumentTypes,
  inferIsForeignerFromNationalite,
};
