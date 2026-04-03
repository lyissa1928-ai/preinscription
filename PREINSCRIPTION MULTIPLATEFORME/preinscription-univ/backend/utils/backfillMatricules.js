const db = require('../database/db');
const { generateNextMatriculeForEtablissement } = require('./matriculeGenerator');
const { normalizeMatricule } = require('./userIdentity');

/** Matricule au format automatique établissement : 3 lettres + 3 chiffres */
function isEtabAutoFormat(m) {
  return /^[A-Z]{3}\d{3}$/.test(normalizeMatricule(m));
}

/**
 * Attribue ou remplace les matricules au format établissement (ex. EFO001) pour tout compte
 * ayant un etablissement_id mais un matricule vide, LEG-*, ou autre ancien format.
 */
function backfillMatriculesFromEstablishments() {
  const users = (db.get('utilisateurs').value() || []).slice().sort((a, b) => a.id - b.id);
  let updated = 0;
  for (const u of users) {
    if (u.role === 'admin') continue;
    if (!u.etablissement_id) continue;
    if (isEtabAutoFormat(u.matricule)) continue;

    const gen = generateNextMatriculeForEtablissement(u.etablissement_id);
    if (gen.error || !gen.matricule) continue;

    db.get('utilisateurs').find({ id: u.id }).assign({ matricule: gen.matricule }).write();
    updated += 1;
  }
  if (updated > 0) {
    console.log(`✅ Matricules établissement : ${updated} compte(s) mis à jour (format 3 lettres + 3 chiffres).`);
  }
}

module.exports = { backfillMatriculesFromEstablishments, isEtabAutoFormat };
