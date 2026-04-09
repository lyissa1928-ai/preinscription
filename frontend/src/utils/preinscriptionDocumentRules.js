/**
 * Aligné sur backend/utils/preinscriptionDocumentRules.js (référentiel pièces).
 * Identité : jamais CNI + passeport obligatoires ensemble ; carte scolaire hors groupe identité,
 * optionnelle seulement pour BT1, BTS1, L1.
 */

export const TEXT_BT1 =
  'BT1 — Pièce d’identité : CNI (Sénégal) ou passeport (étranger), une seule obligatoire ; carte scolaire facultative ; diplôme BFEM ou équivalent ; lettre de motivation.';

export const TEXT_BT2 =
  'BT2 — Pièce d’identité : CNI ou passeport selon nationalité (une seule) ; pas de carte scolaire ; relevé BT1 ; certificat de scolarité ; diplôme BFEM ; lettre de motivation.';

export const TEXT_BTS1 =
  'BTS1 — CNI ou passeport selon nationalité ; carte scolaire facultative ; relevé BAC ; bulletins Seconde, Première, Terminale ; diplôme BAC ou attestation ; lettre de motivation.';

export const TEXT_BTS2 =
  'BTS2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés BTS1 ; certificat de scolarité ; relevé BAC ; diplôme BAC ou équivalent ; lettre de motivation.';

export const TEXT_L1 =
  'L1 — CNI ou passeport selon nationalité ; carte scolaire facultative ; relevé BAC ; bulletins Seconde à Terminale ; diplôme BAC ou attestation ; lettre de motivation.';

export const TEXT_L2 =
  'L2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1 S1 et S2 ; relevé BAC ; diplôme BAC ou équivalent ; lettre de motivation.';

export const TEXT_L3 =
  'L3 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1 et L2 ; relevé BAC ; diplôme BAC ou équivalent ; lettre de motivation.';

export const TEXT_M1 =
  'M1 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés L1, L2, L3 ; diplôme Licence ou attestation ; CV ; lettre de motivation.';

export const TEXT_M2 =
  'M2 — CNI ou passeport selon nationalité ; pas de carte scolaire ; relevés M1 ; attestation M1 ; diplôme Licence ou équivalent ; CV ; lettre de motivation.';

export const TEXT_GENERIC =
  'Pièce d’identité : CNI ou passeport (une seule selon nationalité) ; diplôme et relevé du dernier niveau ; lettre de motivation ; photo d’identité obligatoire.';

/** Cycles où une carte scolaire peut être proposée en option (pas pour l’identité). */
export const CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE = ['bt1', 'bts1', 'l1'];

export const MAX_PHOTOS_PREINSCRIPTION = 10;

export function normalizeNombrePhotosPreinscription(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_PHOTOS_PREINSCRIPTION, Math.floor(n));
}

export function photoSlotKeysForCount(nombrePhotos) {
  const c = normalizeNombrePhotosPreinscription(nombrePhotos);
  return Array.from({ length: c }, (_, i) => `photo_${i + 1}`);
}

/** Première photo utile pour aperçus (photo_1, ou ancien type `photo`). */
export function primaryPhotoDocumentFromList(documents) {
  const list = documents || [];
  const p1 = list.find((d) => d.type_document === 'photo_1');
  if (p1) return p1;
  const legacy = list.find((d) => d.type_document === 'photo');
  if (legacy) return legacy;
  const numbered = list
    .filter((d) => /^photo_\d+$/.test(String(d.type_document)))
    .sort(
      (a, b) =>
        parseInt(String(a.type_document).replace(/^photo_/, ''), 10) -
        parseInt(String(b.type_document).replace(/^photo_/, ''), 10),
    );
  return numbered[0] || null;
}

/** Icône / libellé : photo unique héritée ou slots photo_1 … photo_n. */
export function isPhotoDocumentType(type_document) {
  const t = String(type_document || '');
  return t === 'photo' || /^photo_\d+$/.test(t);
}

function expandPhotoInRequired(requiredArr, nombrePhotos) {
  const slots = photoSlotKeysForCount(nombrePhotos);
  return requiredArr.flatMap((x) => (x === 'photo' ? slots : [x]));
}

/**
 * @returns {boolean|undefined} false = profil national (Sénégal), true = étranger, undefined = inconnu
 */
export function inferIsForeignerFromNationalite(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return undefined;
  if (/^(sn|sen|senegal|sénégal)$/.test(s)) return false;
  if (/\bsenegal\b|\bsénégal\b/.test(s)) return false;
  if (/\bsenegalais\b|\bsénégalais\b|\bsenegalaise\b|\bsénégalaise\b/.test(s)) return false;
  return true;
}

/**
 * Groupes « au moins un fichier » pour l’identité (hors carte scolaire).
 * @returns {string[][]}
 */
export function getIdentityOneOfGroups(nationalite) {
  const isForeign = inferIsForeignerFromNationalite(nationalite);
  if (isForeign === true) return [['passeport']];
  if (isForeign === false) return [['piece_identite']];
  return [['piece_identite', 'passeport']];
}

export const DOC_FIELD_LABELS = {
  identite_ou_passeport: 'Pièce d’identité (selon nationalité)',
  piece_identite: 'CNI — carte nationale d’identité',
  carte_scolaire: 'Carte scolaire (facultatif, BT1 / BTS1 / L1)',
  carte_scolaire_terminale: 'Carte scolaire — Terminale (facultatif)',
  passeport: 'Passeport',
  diplome_bfem: 'Diplôme du BFEM ou équivalent',
  releve_bt1: 'Relevé de notes BT1 (ou relevés BTS1 si applicable)',
  certificat_scolarite_annee_precedente: 'Certificat de scolarité (année précédente)',
  releve_bac: 'Relevé de notes du BAC',
  bulletin_seconde: 'Bulletin de notes — Seconde',
  bulletin_premiere: 'Bulletin de notes — Première',
  bulletin_terminale: 'Bulletin de notes — Terminale',
  diplome_bac: 'Diplôme du BAC ou attestation de réussite',
  releve_l1_s1: 'Relevé de notes L1 — Semestre 1',
  releve_l1_s2: 'Relevé de notes L1 — Semestre 2',
  releve_l2_s1: 'Relevé de notes L2 — Semestre 1',
  releve_l2_s2: 'Relevé de notes L2 — Semestre 2',
  releve_l3_s1: 'Relevé de notes L3 — Semestre 1',
  releve_l3_s2: 'Relevé de notes L3 — Semestre 2',
  diplome_licence3_ou_attestation: 'Diplôme de Licence ou attestation de réussite',
  copie_diplome_licence: 'Copie du diplôme de Licence',
  attestation_reussite_licence: 'Attestation de réussite (Licence)',
  attestation_m1: 'Attestation ou validation Master 1',
  releve_m1_s1: 'Relevé de notes Master 1 — Semestre 1',
  releve_m1_s2: 'Relevé de notes Master 1 — Semestre 2',
  cv: 'Curriculum vitae (CV)',
  lettre_motivation: 'Lettre de motivation',
  photo_1: 'Photo d’identité n°1',
  photo_2: 'Photo d’identité n°2',
  photo_3: 'Photo d’identité n°3',
  photo_4: 'Photo d’identité n°4',
  photo_5: 'Photo d’identité n°5',
  photo_6: 'Photo d’identité n°6',
  photo_7: 'Photo d’identité n°7',
  photo_8: 'Photo d’identité n°8',
  photo_9: 'Photo d’identité n°9',
  photo_10: 'Photo d’identité n°10',
  diplome: 'Diplôme ou attestation (dernier niveau)',
  releve_notes: 'Relevé de notes',
  releve_l1: 'Relevé de notes — 1ère année (ancien format)',
  releve_l2: 'Relevé de notes — 2ème année (ancien format)',
  releve_l3: 'Relevé de notes — 3ème année (ancien format)',
  copie_licence3: 'Copie Licence 3 (ancien format)',
  copie_master1: 'Copie Master 1 (ancien format)',
};

export function normalizePreinscriptionNiveau(niveau) {
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
 * @returns {{ required: string[], oneOf: string[][] }}
 * oneOf inclut le groupe identité (CNI ou passeport selon nationalité, jamais les deux obligatoires).
 * @param {number} [nombrePhotos=1] — nombre de photos exigées (formation), 1–10, aligné sur `formation.nombre_photos_preinscription`.
 */
export function getRequiredFileFieldKeys(niveauKey, nationalite, nombrePhotos = 1) {
  const k = LEVEL_KEYS.includes(niveauKey) ? niveauKey : 'generic';
  const idGroups = getIdentityOneOfGroups(nationalite);

  let base;
  if (k === 'bt1') base = ['diplome_bfem', 'lettre_motivation', 'photo'];
  else if (k === 'bt2') {
    base = [
      'releve_bt1',
      'certificat_scolarite_annee_precedente',
      'diplome_bfem',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'bts1') {
    base = [
      'releve_bac',
      'bulletin_seconde',
      'bulletin_premiere',
      'bulletin_terminale',
      'diplome_bac',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'bts2') {
    base = [
      'releve_bt1',
      'certificat_scolarite_annee_precedente',
      'releve_bac',
      'diplome_bac',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'l1') {
    base = [
      'releve_bac',
      'bulletin_seconde',
      'bulletin_premiere',
      'bulletin_terminale',
      'diplome_bac',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'l2') {
    base = ['releve_l1_s1', 'releve_l1_s2', 'releve_bac', 'diplome_bac', 'lettre_motivation', 'photo'];
  } else if (k === 'l3') {
    base = [
      'releve_l1_s1',
      'releve_l1_s2',
      'releve_l2_s1',
      'releve_l2_s2',
      'releve_bac',
      'diplome_bac',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'm1') {
    base = [
      'releve_l1_s1',
      'releve_l1_s2',
      'releve_l2_s1',
      'releve_l2_s2',
      'releve_l3_s1',
      'releve_l3_s2',
      'diplome_licence3_ou_attestation',
      'cv',
      'lettre_motivation',
      'photo',
    ];
  } else if (k === 'm2') {
    base = [
      'copie_diplome_licence',
      'attestation_reussite_licence',
      'attestation_m1',
      'releve_m1_s1',
      'releve_m1_s2',
      'cv',
      'lettre_motivation',
      'photo',
    ];
  } else {
    base = ['diplome', 'releve_notes', 'lettre_motivation', 'photo'];
  }

  return { required: expandPhotoInRequired(base, nombrePhotos), oneOf: idGroups };
}

export function getParagraphsForNiveauKey(niveauKey) {
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

/** Champs carte scolaire affichés en option (non bloquants). */
export function getOptionalCarteScolaireFieldKeys(niveauKey) {
  return CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE.includes(niveauKey)
    ? ['carte_scolaire', 'carte_scolaire_terminale']
    : [];
}

export function areRequiredFilesPresent(files, niveauKey, nationalite, nombrePhotos = 1) {
  const { required, oneOf } = getRequiredFileFieldKeys(niveauKey, nationalite, nombrePhotos);
  for (const x of required) {
    if (!files[x]) return false;
  }
  for (const group of oneOf) {
    if (!group.some((k) => files[k])) return false;
  }
  return true;
}

export function emptyDossierFilesState() {
  const o = {};
  Object.keys(DOC_FIELD_LABELS).forEach((k) => {
    if (k === 'identite_ou_passeport') return;
    o[k] = null;
  });
  return o;
}
