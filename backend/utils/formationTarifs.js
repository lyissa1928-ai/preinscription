/**
 * Tarification formations : forfait annuel = frais d'inscription + (mensualité × durée en mois).
 * Les frais supplémentaires (désignation + montant) sont affichés à part et ne sont pas inclus dans le total annuel.
 */

/**
 * @param {object} formation
 * @returns {number} nombre de mois (≥ 0)
 */
function getDureeMois(formation) {
  if (formation == null) return 0;
  if (formation.duree_mois != null && formation.duree_mois !== '') {
    const n = parseInt(String(formation.duree_mois), 10);
    if (Number.isFinite(n) && n >= 0 && n <= 120) return n;
  }
  return parseDureeMoisFromText(formation.duree);
}

/**
 * Durée en mois pour calculs : champ explicite / texte, ou inférence depuis l’ancien couple prix / mensualité.
 */
function getDureeMoisEffectif(formation) {
  let mois = getDureeMois(formation);
  if (mois > 0) return mois;
  const fi = parseInt(formation?.frais_inscription, 10) || 0;
  const men = parseInt(formation?.mensualite, 10) || 0;
  const stored = parseInt(formation?.prix, 10) || 0;
  if (men > 0 && stored > fi) {
    const inferred = Math.round((stored - fi) / men);
    if (inferred > 0 && inferred <= 120) return inferred;
  }
  return 0;
}

function parseDureeMoisFromText(duree) {
  const s = String(duree || '').trim();
  if (!s) return 0;
  const m = s.match(/(\d+)\s*(mois|month|months?|m(?![a-z]))/i);
  if (m) return Math.min(120, Math.max(0, parseInt(m[1], 10)));
  const years = s.match(/(\d+)\s*(an|ans|year)/i);
  if (years) return Math.min(120, Math.max(0, parseInt(years[1], 10) * 12));
  const digits = s.match(/\d+/g);
  if (digits && digits.length) {
    const n = parseInt(digits[0], 10);
    if (Number.isFinite(n) && n > 0 && n <= 120) return n;
  }
  return 0;
}

/**
 * Total annuel (forfait scolarité) = inscription + mensualités sur la durée.
 */
function computePrixAnnuel(formation) {
  const fromEl = buildLignesFromElementsFacturation(formation);
  if (fromEl) return Math.max(0, fromEl.montant_ht);
  const fi = parseInt(formation?.frais_inscription, 10) || 0;
  const men = parseInt(formation?.mensualite, 10) || 0;
  const mois = getDureeMoisEffectif(formation);
  return Math.max(0, fi + men * mois);
}

/**
 * @param {unknown} raw
 * @returns {{ designation: string, montant: number }[]}
 */
function normalizeFraisSupplementaires(raw) {
  if (raw == null) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => ({
      designation: String(x?.designation || '').trim(),
      montant: Math.max(0, parseInt(x?.montant, 10) || 0),
    }))
    .filter((x) => x.designation && x.montant > 0);
}

/**
 * Normalise les éléments de facturation libres (libellé exact, ordre, actif).
 */
function normalizeElementsFacturation(raw) {
  if (raw == null) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((x, idx) => ({
      id: String(x?.id || `el-${idx}-${Date.now()}`),
      libelle: String(x?.libelle || x?.designation || '').trim(),
      type: String(x?.type || 'fixe'),
      montant: Math.max(0, parseInt(String(x?.montant ?? ''), 10) || 0),
      quantite: x?.quantite != null && x.quantite !== '' ? Math.max(0, parseInt(String(x.quantite), 10) || 0) : null,
      actif: x?.actif !== false,
      ordre: x?.ordre != null ? Number(x.ordre) : idx,
      hors_forfait: x?.hors_forfait === true || x?.type === 'hors_forfait',
    }))
    .filter((x) => x.libelle);
}

/**
 * Libellés de champs tarifaires personnalisables (formation.libelles_champs).
 * Jamais de libellé générique imposé en facture si le responsable a configuré le sien.
 */
function labelChamp(formation, key, fallback) {
  const map = formation?.libelles_champs && typeof formation.libelles_champs === 'object'
    ? formation.libelles_champs
    : {};
  const custom = map[key];
  if (custom != null && String(custom).trim() !== '') return String(custom).trim();
  return fallback;
}

/**
 * Liste complète des frais hors forfait (bibliothèque, EPI, soutenance, tableau libre).
 * Les désignations viennent des libellés configurés ou du champ `designation` saisi.
 */
function getFraisSupplementairesEffectifs(formation) {
  const dedicated = [];
  const bib = parseInt(formation?.frais_bibliotheque, 10) || 0;
  const epi = parseInt(formation?.frais_epi, 10) || 0;
  const sout = parseInt(formation?.frais_soutenance, 10) || 0;
  if (bib > 0) {
    dedicated.push({
      designation: labelChamp(formation, 'frais_bibliotheque', 'Bibliothèque'),
      montant: bib,
    });
  }
  if (epi > 0) {
    dedicated.push({
      designation: labelChamp(formation, 'frais_epi', 'EPI'),
      montant: epi,
    });
  }
  if (sout > 0) {
    dedicated.push({
      designation: labelChamp(formation, 'frais_soutenance', 'Frais de soutenance'),
      montant: sout,
    });
  }

  const n = normalizeFraisSupplementaires(formation?.frais_supplementaires);
  const merged = [...dedicated];
  n.forEach((x) => {
    const des = String(x.designation || '').toLowerCase();
    // Éviter doublons si déjà en champs dédiés (libellés par défaut ou custom proches)
    if (['bibliothèque', 'bibliotheque', 'epi', 'frais de soutenance', 'soutenance'].includes(des)) {
      return;
    }
    merged.push(x);
  });
  if (merged.length > 0) return merged;
  const legacy = parseInt(formation?.autres_frais, 10) || 0;
  if (legacy > 0) {
    // Dernier recours : utiliser un libellé custom si fourni, sinon la désignation stockée
    return [{
      designation: labelChamp(formation, 'autres_frais', formation?.autres_frais_libelle || 'Autres frais'),
      montant: legacy,
    }];
  }
  return [];
}

/**
 * Éléments de facturation configurables (libellés libres, ordre, actif).
 * Si présents et non vides, ils remplacent la structure tarifaire « legacy ».
 * @returns {null|{ montant_ht, lignes, lignes_supplementaires, montant_supplementaires, duree_mois }}
 */
function buildLignesFromElementsFacturation(formation) {
  const raw = formation?.elements_facturation;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const mois = getDureeMoisEffectif(formation);
  const elements = raw
    .map((e, idx) => ({
      id: e?.id || `el-${idx}`,
      libelle: String(e?.libelle || '').trim(),
      type: String(e?.type || 'fixe'),
      montant: Math.max(0, parseInt(String(e?.montant ?? ''), 10) || 0),
      quantite: e?.quantite != null ? Math.max(0, parseInt(String(e.quantite), 10) || 0) : null,
      actif: e?.actif !== false,
      ordre: e?.ordre != null ? Number(e.ordre) : idx,
      hors_forfait: e?.hors_forfait === true || e?.type === 'hors_forfait',
    }))
    .filter((e) => e.libelle && e.actif)
    .sort((a, b) => a.ordre - b.ordre);

  if (elements.length === 0) return null;

  const lignes = [];
  const lignes_supplementaires = [];
  let montant_ht = 0;

  for (const el of elements) {
    if (el.type === 'mensualite' || el.type === 'mensualites') {
      const qte = el.quantite > 0 ? el.quantite : mois;
      if (el.montant <= 0) continue;
      lignes.push({
        designation: el.libelle,
        montant: el.montant,
        kind: 'mensualite_unitaire',
        duree_mois: qte,
        total_mensualites: el.montant * qte,
      });
      montant_ht += el.montant * qte;
      continue;
    }
    if (el.hors_forfait || el.type === 'hors_forfait') {
      if (el.montant <= 0) continue;
      lignes_supplementaires.push({
        designation: el.libelle,
        montant: el.montant,
        hors_forfait_annuel: true,
      });
      continue;
    }
    // fixe / inscription / autres — libellé exact conservé
    if (el.montant <= 0) continue;
    lignes.push({
      designation: el.libelle,
      montant: el.montant,
      kind: el.type === 'inscription' ? 'inscription' : undefined,
    });
    montant_ht += el.montant;
  }

  return {
    montant_ht,
    lignes,
    lignes_supplementaires,
    montant_supplementaires: lignes_supplementaires.reduce((a, b) => a + b.montant, 0),
    duree_mois: mois,
  };
}

/**
 * Détail des lignes pour facture / proforma (forfait annuel uniquement dans montant_ht).
 */
function buildLignesForfaitAnnuel(formation) {
  const fromElements = buildLignesFromElementsFacturation(formation);
  if (fromElements) return fromElements;

  const fi = parseInt(formation?.frais_inscription, 10) || 0;
  const men = parseInt(formation?.mensualite, 10) || 0;
  const mois = getDureeMoisEffectif(formation);
  const partMensualites = men * mois;
  const montant_ht = fi + partMensualites;

  const lignes = [];
  if (fi > 0) {
    lignes.push({
      designation: labelChamp(formation, 'frais_inscription', "Frais d'inscription"),
      montant: fi,
      kind: 'inscription',
    });
  }
  if (mois > 0 && men > 0) {
    lignes.push({
      designation: labelChamp(formation, 'mensualite', 'Mensualité'),
      montant: men,
      kind: 'mensualite_unitaire',
      duree_mois: mois,
      total_mensualites: partMensualites,
    });
  } else if (partMensualites > 0) {
    lignes.push({
      designation: labelChamp(formation, 'scolarite', 'Scolarité'),
      montant: partMensualites,
    });
  }
  if (lignes.length === 0) {
    lignes.push({
      designation: labelChamp(formation, 'forfait', 'Forfait formation'),
      montant: montant_ht,
    });
  }

  const supp = getFraisSupplementairesEffectifs(formation);
  const lignes_supplementaires = supp.map((s) => ({
    designation: s.designation,
    montant: s.montant,
    hors_forfait_annuel: true,
  }));

  return {
    montant_ht,
    lignes,
    lignes_supplementaires,
    montant_supplementaires: supp.reduce((a, b) => a + b.montant, 0),
    duree_mois: mois,
  };
}

/**
 * Applique le prix calculé sur un objet formation (mutation logique pour sauvegarde).
 */
function withPrixAnnuelComputed(formation) {
  const prix = computePrixAnnuel(formation);
  return { ...formation, prix };
}

/**
 * Objet `facture` pour une demande proforma (aligné sur le barème actuel de la formation).
 */
function mergeFactureProformaFromFormation(formation, existingFacture) {
  const tarif = buildLignesForfaitAnnuel(formation);
  return {
    ...(existingFacture || {}),
    numero: existingFacture?.numero,
    lignes: tarif.lignes,
    lignes_frais_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht: tarif.montant_ht,
    tva: existingFacture?.tva ?? 0,
    montant_ttc: tarif.montant_ht,
    validite_jusqu_au: existingFacture?.validite_jusqu_au,
  };
}

module.exports = {
  getDureeMois,
  getDureeMoisEffectif,
  computePrixAnnuel,
  normalizeFraisSupplementaires,
  normalizeElementsFacturation,
  getFraisSupplementairesEffectifs,
  buildLignesFromElementsFacturation,
  buildLignesForfaitAnnuel,
  mergeFactureProformaFromFormation,
  withPrixAnnuelComputed,
  parseDureeMoisFromText,
  labelChamp,
};
