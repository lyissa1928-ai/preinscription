/** Affichage attestation : nom, prénom et formation même si données partielles (guichet / visiteur). */
export function resolveAffichageCandidat({ etudiant, dossier, demande } = {}) {
  let prenom = String(etudiant?.prenom || dossier?.prenom || demande?.prenom || '').trim()
  let nom = String(etudiant?.nom || dossier?.nom || demande?.nom || '').trim()
  const email = String(etudiant?.email || dossier?.email || demande?.email || '').trim()

  if (demande?.type_payeur === 'organisation' && demande?.payeur?.org_nom) {
    if (!nom || nom === '—') nom = String(demande.payeur.org_nom).trim()
    if (!prenom || prenom === '—') prenom = 'Organisation'
  }

  if ((!prenom || prenom === '—') && (!nom || nom === '—') && email) {
    prenom = email.split('@')[0] || 'Client'
    nom = '—'
  }

  if (!prenom || prenom === '—') prenom = '—'
  if (!nom || nom === '—') nom = '—'

  const nomComplet =
    [prenom, nom].filter((p) => p && p !== '—').join(' ') || email || '—'

  return { prenom, nom, email, nomComplet }
}

export function resolveFormationAffichage({
  formation_libelle,
  filiere_libelle,
  niveau_libelle,
  annee_academique,
  dossier,
  demande,
  formation,
} = {}) {
  return {
    formation_libelle:
      formation_libelle
      || formation?.titre
      || dossier?.filiere
      || demande?.formation_titre
      || '—',
    filiere_libelle: filiere_libelle || dossier?.filiere || '—',
    niveau_libelle:
      niveau_libelle
      || formation?.niveau
      || dossier?.niveau
      || dossier?.formation_niveau_cible
      || demande?.niveau
      || '—',
    annee_academique: annee_academique || dossier?.annee_academique || '—',
  }
}
