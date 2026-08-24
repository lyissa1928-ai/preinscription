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

module.exports = { resolveCandidatIdentite };
