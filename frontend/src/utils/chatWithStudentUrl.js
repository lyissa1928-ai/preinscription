/**
 * Lien vers le chat avec un étudiant (responsable pédagogique).
 * La page /chat lit les paramètres peer, prenom, nom, peerRole.
 */
export function chatWithStudentUrl(etudiantId, prenom = '', nom = '') {
  if (etudiantId == null || etudiantId === '') return '/chat'
  const p = new URLSearchParams()
  p.set('peer', String(etudiantId))
  if (prenom) p.set('prenom', String(prenom))
  if (nom) p.set('nom', String(nom))
  p.set('peerRole', 'etudiant')
  return `/chat?${p.toString()}`
}
