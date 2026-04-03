const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, directeurOrAdmin } = require('../middleware/auth');
const { publicAssetUrl } = require('../utils/publicAssetUrl');

router.use(authMiddleware, directeurOrAdmin);

// ─── Helper : filtre dossiers par établissement ───────────────────────────────
function filterByEtab(req, dossiers, formations) {
  const etabId = req.user.role !== 'admin' ? req.user.etablissement_id : null;
  if (!etabId) return { dossiers, etabId: null };
  const etabFormationIds = formations.filter(f => f.etablissement_id === etabId).map(f => f.id);
  const filtered = dossiers.filter(d => {
    if (d.etablissement_id) return d.etablissement_id === etabId;
    if (d.formation_id) return etabFormationIds.includes(d.formation_id);
    return false;
  });
  return { dossiers: filtered, etabId };
}

// ─── GET /api/directeur/dashboard ────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  const allDossiers   = db.get('dossiers').value();
  const utilisateurs  = db.get('utilisateurs').value();
  const allDemandes   = db.get('demandes_proforma').value();
  const formations    = db.get('formations').value();

  const { dossiers, etabId } = filterByEtab(req, allDossiers, formations);

  // Établissement info
  const etab = etabId ? db.get('etablissements').find({ id: etabId }).value() : null;

  // Demandes proforma filtrées
  const demandes = etabId ? allDemandes.filter(d => d.etablissement_id === etabId) : allDemandes;

  const acceptes = dossiers.filter(d => d.statut === 'accepte').length;
  const refuses  = dossiers.filter(d => d.statut === 'refuse').length;
  const total    = dossiers.length;
  const tauxAcceptance = total > 0 ? Math.round((acceptes / total) * 100) : 0;

  // Formations de l'établissement (ou toutes si admin)
  const etabFormations = etabId ? formations.filter(f => f.etablissement_id === etabId) : formations;

  // Stats par formation
  const parFormation = {};
  dossiers.forEach(d => {
    const f = formations.find(f => f.id === d.formation_id);
    const key = f ? f.titre : 'Formation inconnue';
    if (!parFormation[key]) parFormation[key] = { titre: key, type: f ? f.type : null, total: 0, acceptes: 0, refuses: 0 };
    parFormation[key].total++;
    if (d.statut === 'accepte') parFormation[key].acceptes++;
    if (d.statut === 'refuse') parFormation[key].refuses++;
  });

  // Activités récentes
  const recents = [...dossiers]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 6)
    .map(d => {
      const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
      const f = formations.find(f => f.id === d.formation_id) || {};
      return { id: d.id, numero_dossier: d.numero_dossier, statut: d.statut, nom: u.nom, prenom: u.prenom, formation: f.titre, updated_at: d.updated_at || d.created_at };
    });

  res.json({
    etablissement: etab ? { nom: etab.nom, couleur_primaire: etab.couleur_primaire, logo_url: publicAssetUrl(req, etab.logo_url) } : null,
    total_dossiers: total,
    acceptes,
    refuses,
    en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
    en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
    taux_acceptance: tauxAcceptance,
    total_etudiants: utilisateurs.filter(u => u.role === 'etudiant').length,
    total_formations: etabFormations.filter(f => f.actif !== false).length,
    demandes_proforma: demandes.length,
    par_formation: Object.values(parFormation).sort((a, b) => b.total - a.total).slice(0, 6),
    recents
  });
});

// ─── GET /api/directeur/dossiers ─────────────────────────────────────────────
router.get('/dossiers', (req, res) => {
  const { statut, page = 1, limit = 15 } = req.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);

  const utilisateurs = db.get('utilisateurs').value();
  const formations   = db.get('formations').value();
  const allDossiers  = db.get('dossiers').value();

  const { dossiers: filtered } = filterByEtab(req, allDossiers, formations);

  let dossiers = filtered.map(d => {
    const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
    const f = formations.find(f => f.id === d.formation_id) || {};
    return { ...d, nom: u.nom, prenom: u.prenom, email: u.email, formation_titre: f.titre, formation_type: f.type };
  });

  if (statut) dossiers = dossiers.filter(d => d.statut === statut);
  dossiers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total     = dossiers.length;
  const paginated = dossiers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ dossiers: paginated, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
});

// ─── GET /api/directeur/statistiques ─────────────────────────────────────────
router.get('/statistiques', (req, res) => {
  const allDossiers  = db.get('dossiers').value();
  const utilisateurs = db.get('utilisateurs').value();
  const formations   = db.get('formations').value();
  const allDemandes  = db.get('demandes_proforma').value();

  const { dossiers, etabId } = filterByEtab(req, allDossiers, formations);
  const demandes = etabId ? allDemandes.filter(d => d.etablissement_id === etabId) : allDemandes;

  const fad       = dossiers.filter(d => d.type_formation === 'en_ligne');
  const presentiel = dossiers.filter(d => d.type_formation === 'presentiel');
  const etabFormations = etabId ? formations.filter(f => f.etablissement_id === etabId) : formations;

  res.json({
    global: {
      total_dossiers: dossiers.length,
      total_etudiants: utilisateurs.filter(u => u.role === 'etudiant').length,
      demandes_proforma: demandes.length,
      taux_acceptance: dossiers.length > 0 ? Math.round((dossiers.filter(d => d.statut === 'accepte').length / dossiers.length) * 100) : 0
    },
    par_statut: {
      en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
      en_cours:   dossiers.filter(d => d.statut === 'en_cours').length,
      accepte:    dossiers.filter(d => d.statut === 'accepte').length,
      refuse:     dossiers.filter(d => d.statut === 'refuse').length
    },
    par_mode: {
      fad:       { total: fad.length,        acceptes: fad.filter(d => d.statut === 'accepte').length },
      presentiel: { total: presentiel.length, acceptes: presentiel.filter(d => d.statut === 'accepte').length }
    },
    formations_actives: etabFormations.filter(f => f.actif !== false).length
  });
});

module.exports = router;
