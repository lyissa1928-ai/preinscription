/**
 * Agrégations statistiques partagées (dashboards admin / responsable).
 * Champs additionnels uniquement — les clés existantes sont conservées.
 */

function countDossiersByStatut(dossiers) {
  const list = dossiers || [];
  const en_attente = list.filter((d) => d.statut === 'en_attente').length;
  const en_cours = list.filter((d) => d.statut === 'en_cours').length;
  const acceptes = list.filter((d) => d.statut === 'accepte').length;
  const refuses = list.filter((d) => d.statut === 'refuse').length;
  const total = list.length;
  const traites = acceptes + refuses;
  const taux_acceptation_pct =
    traites > 0 ? Math.round((acceptes / traites) * 1000) / 10 : null;
  return { total, en_attente, en_cours, acceptes, refuses, taux_acceptation_pct };
}

function dossiersRecents(dossiers, utilisateurs, limit = 5) {
  const usersById = new Map((utilisateurs || []).map((u) => [u.id, u]));
  return [...(dossiers || [])]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit)
    .map((d) => {
      const u = usersById.get(d.etudiant_id) || {};
      return {
        numero_dossier: d.numero_dossier,
        statut: d.statut,
        created_at: d.created_at,
        nom: u.nom,
        prenom: u.prenom,
        etablissement_id: d.etablissement_id || null,
        formation_id: d.formation_id || null,
      };
    });
}

function statsParEtablissement(dossiers, etablissements, formations) {
  const formById = new Map((formations || []).map((f) => [f.id, f]));
  const byEtab = {};
  (etablissements || []).forEach((e) => {
    byEtab[e.id] = {
      etablissement_id: e.id,
      nom: e.nom,
      ...countDossiersByStatut([]),
    };
  });
  (dossiers || []).forEach((d) => {
    let eid = d.etablissement_id;
    if (!eid && d.formation_id) {
      const f = formById.get(d.formation_id);
      eid = f ? f.etablissement_id : null;
    }
    if (!eid) return;
    if (!byEtab[eid]) {
      byEtab[eid] = { etablissement_id: eid, nom: `Établissement #${eid}`, ...countDossiersByStatut([]) };
    }
    const bucket = byEtab[eid];
    bucket.total += 1;
    if (d.statut === 'en_attente') bucket.en_attente += 1;
    else if (d.statut === 'en_cours') bucket.en_cours += 1;
    else if (d.statut === 'accepte') bucket.acceptes += 1;
    else if (d.statut === 'refuse') bucket.refuses += 1;
    const traites = bucket.acceptes + bucket.refuses;
    bucket.taux_acceptation_pct =
      traites > 0 ? Math.round((bucket.acceptes / traites) * 1000) / 10 : null;
  });
  return Object.values(byEtab).sort((a, b) => b.total - a.total);
}

module.exports = {
  countDossiersByStatut,
  dossiersRecents,
  statsParEtablissement,
};
