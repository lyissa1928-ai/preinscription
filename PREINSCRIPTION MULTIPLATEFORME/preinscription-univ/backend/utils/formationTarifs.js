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
 * Liste complète des frais sup. (bibliothèque, EPI, soutenance, tableau, legacy).
 */
function getFraisSupplementairesEffectifs(formation) {
  const dedicated = [];
  const bib = parseInt(formation?.frais_bibliotheque, 10) || 0;
  const epi = parseInt(formation?.frais_epi, 10) || 0;
  const sout = parseInt(formation?.frais_soutenance, 10) || 0;
  if (bib > 0) dedicated.push({ designation: 'Bibliothèque', montant: bib });
  if (epi > 0) dedicated.push({ designation: 'EPI', montant: epi });
  if (sout > 0) dedicated.push({ designation: 'Frais de soutenance', montant: sout });

  const n = normalizeFraisSupplementaires(formation?.frais_supplementaires);
  const merged = [...dedicated];
  n.forEach((x) => {
    const des = String(x.designation || '').toLowerCase();
    // Éviter doublons si déjà en champs dédiés
    if (['bibliothèque', 'bibliotheque', 'epi', 'frais de soutenance', 'soutenance'].includes(des)) {
      return;
    }
    merged.push(x);
  });
  if (merged.length > 0) return merged;
  const legacy = parseInt(formation?.autres_frais, 10) || 0;
  if (legacy > 0) {
    return [{ designation: 'Autres frais (legacy)', montant: legacy }];
  }
  return [];
}

/**
 * Détail des lignes pour facture / proforma (forfait annuel uniquement dans montant_ht).
 */
function buildLignesForfaitAnnuel(formation) {
  const fi = parseInt(formation?.frais_inscription, 10) || 0;
  const men = parseInt(formation?.mensualite, 10) || 0;
  const mois = getDureeMoisEffectif(formation);
  const partMensualites = men * mois;
  const montant_ht = fi + partMensualites;

  const lignes = [];
  if (fi > 0) {
    lignes.push({ designation: "Frais d'inscription", montant: fi });
  }
  if (mois > 0 && men > 0) {
    lignes.push({
      designation: 'Mensualité',
      montant: men,
      kind: 'mensualite_unitaire',
      duree_mois: mois,
      total_mensualites: partMensualites,
    });
  } else if (partMensualites > 0) {
    lignes.push({
      designation: 'Scolarité',
      montant: partMensualites,
    });
  }
  if (lignes.length === 0) {
    lignes.push({ designation: 'Forfait formation', montant: montant_ht });
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
  getFraisSupplementairesEffectifs,
  buildLignesForfaitAnnuel,
  mergeFactureProformaFromFormation,
  withPrixAnnuelComputed,
  parseDureeMoisFromText,
};
