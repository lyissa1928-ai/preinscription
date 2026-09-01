/**
 * Identité candidat : dossier en priorité, compte étudiant en complément.
 * Permet les préinscriptions guichet sans compte.
 */
function resolveCandidatIdentite(dossier, utilisateur = {}) {
  const u = utilisateur || {};
  const d = dossier || {};
  return {
    prenom: String(d.prenom || u.prenom || '').trim(),
    nom: String(d.nom || u.nom || '').trim(),
    email: String(d.email || u.email || '').trim(),
    telephone: String(d.telephone || u.telephone || '').trim(),
    sexe: d.sexe || null,
    date_naissance: d.date_naissance || u.date_naissance || null,
    lieu_naissance: d.lieu_naissance || null,
    nationalite: d.nationalite || null,
    pays_residence: d.pays_residence || null,
    adresse: d.adresse || u.adresse || null,
    type_piece: d.type_piece || null,
    numero_piece: d.numero_piece || d.numero_passeport || null,
    numero_passeport: d.numero_passeport || d.numero_piece || null,
    matricule: u.matricule || null,
  };
}

/** Identité minimale pour émission facture / PDF (tolère dossiers guichet ou visiteurs). */
function ensureIdentiteFacture(dossier, utilisateur = {}) {
  const base = resolveCandidatIdentite(dossier, utilisateur);
  let { prenom, nom, email, telephone, adresse, nationalite } = base;

  if (dossier?.type_payeur === 'organisation' && dossier?.payeur?.org_nom) {
    if (!nom) nom = String(dossier.payeur.org_nom).trim();
    if (!prenom) prenom = 'Organisation';
  }

  if (!prenom && !nom && email) {
    const local = email.split('@')[0] || '';
    prenom = local || 'Client';
    nom = nom || '—';
  }

  if (!prenom) prenom = '—';
  if (!nom) nom = '—';

  return {
    ...base,
    prenom,
    nom,
    email,
    telephone,
    adresse,
    nationalite,
  };
}

function buildEtudiantSnapshot(dossier, utilisateur = {}) {
  const identite = ensureIdentiteFacture(dossier, utilisateur);
  return {
    nom: identite.nom,
    prenom: identite.prenom,
    email: identite.email,
    telephone: identite.telephone || dossier?.telephone,
    adresse: identite.adresse || dossier?.adresse,
    nationalite: identite.nationalite || dossier?.nationalite,
  };
}

module.exports = { resolveCandidatIdentite, ensureIdentiteFacture, buildEtudiantSnapshot };
