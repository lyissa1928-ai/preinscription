/**
 * Espace Contrôleur qualité — périmètre établissement (dossiers, complétude pièces).
 */
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, controleurQualiteOrAdmin } = require('../middleware/auth');
const {
  normalizePreinscriptionNiveau,
  normalizeNombrePhotosPreinscription,
  getDocumentChecklistDefinition,
  computeMissingDocumentTypes,
} = require('../utils/preinscriptionDocumentRules');

router.use(authMiddleware, controleurQualiteOrAdmin);

function filterDossiersByEtab(req, dossiers) {
  const etabId = req.user.role === 'admin' || req.user.role === 'directeur' ? null : req.user.etablissement_id;
  if (!etabId) return dossiers;
  const formationIds = (db.get('formations').value() || [])
    .filter((f) => f.etablissement_id === etabId)
    .map((f) => f.id);
  return dossiers.filter((d) => {
    if (d.etablissement_id) return d.etablissement_id === etabId;
    if (d.formation_id) return formationIds.includes(d.formation_id);
    return false;
  });
}

function qualiteScoreForDossier(dossier, documents, formation) {
  const profile = dossier.document_rule_profile || normalizePreinscriptionNiveau(dossier.formation_niveau_cible);
  const nPhotos = formation
    ? normalizeNombrePhotosPreinscription(formation.nombre_photos_preinscription)
    : 1;
  const def = getDocumentChecklistDefinition(profile, dossier.nationalite, nPhotos);
  const required = [...def.required, ...def.identityKeys];
  const manquants = computeMissingDocumentTypes(documents, profile, dossier.nationalite, nPhotos);
  const ok = Math.max(0, required.length - manquants.length);
  const pct = required.length ? Math.round((ok / required.length) * 100) : 100;
  return {
    completude_pct: pct,
    pieces_manquantes: manquants,
    pieces_requises: required.length,
  };
}

// GET /api/qualite/dashboard
router.get('/dashboard', (req, res) => {
  const allDossiers = filterDossiersByEtab(req, db.get('dossiers').value());
  const documents = db.get('documents').value();
  const utilisateurs = db.get('utilisateurs').value();
  const formations = db.get('formations').value();

  let sommeCompletude = 0;
  let nScores = 0;
  const alerts = [];

  for (const d of allDossiers) {
    const docs = documents.filter((x) => x.dossier_id === d.id);
    const fo = d.formation_id ? formations.find((x) => x.id === d.formation_id) : null;
    const sc = qualiteScoreForDossier(d, docs, fo);
    sommeCompletude += sc.completude_pct;
    nScores += 1;
    if (sc.completude_pct < 70 && ['en_attente', 'en_cours'].includes(d.statut)) {
      const u = utilisateurs.find((x) => x.id === d.etudiant_id) || {};
      alerts.push({
        dossier_id: d.id,
        numero_dossier: d.numero_dossier,
        etudiant: `${u.prenom || ''} ${u.nom || ''}`.trim(),
        completude_pct: sc.completude_pct,
        pieces_manquantes: sc.pieces_manquantes.slice(0, 4),
      });
    }
  }

  const parStatut = {
    en_attente: allDossiers.filter((x) => x.statut === 'en_attente').length,
    en_cours: allDossiers.filter((x) => x.statut === 'en_cours').length,
    accepte: allDossiers.filter((x) => x.statut === 'accepte').length,
    refuse: allDossiers.filter((x) => x.statut === 'refuse').length,
  };

  const etabId = req.user.role === 'admin' || req.user.role === 'directeur' ? null : req.user.etablissement_id;
  const etab = etabId ? db.get('etablissements').find({ id: etabId }).value() : null;

  res.json({
    etablissement: etab ? { id: etab.id, nom: etab.nom, couleur_primaire: etab.couleur_primaire } : null,
    total_dossiers: allDossiers.length,
    par_statut: parStatut,
    completude_moyenne_pct: nScores ? Math.round(sommeCompletude / nScores) : 0,
    dossiers_sous_seuil: alerts.length,
    alertes_recentes: alerts.slice(0, 8),
    indicateurs: [
      { id: 'docs', label: 'Complétude dossiers', value: nScores ? Math.round(sommeCompletude / nScores) : 0, suffix: '%', hint: 'Pièces requises vs déposées' },
      { id: 'pending', label: 'En instruction', value: parStatut.en_attente + parStatut.en_cours, suffix: '', hint: 'À contrôler' },
      { id: 'ok', label: 'Acceptés', value: parStatut.accepte, suffix: '', hint: 'Dossiers validés' },
    ],
  });
});

// GET /api/qualite/dossiers?page=1&limit=20&statut=&min_completude=
router.get('/dossiers', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 20));
  const statutFilter = req.query.statut ? String(req.query.statut) : null;
  const minCompletude = req.query.min_completude != null ? parseInt(req.query.min_completude, 10) : null;

  let dossiers = filterDossiersByEtab(req, db.get('dossiers').value());
  const documents = db.get('documents').value();
  const utilisateurs = db.get('utilisateurs').value();
  const formations = db.get('formations').value();

  if (statutFilter) dossiers = dossiers.filter((d) => d.statut === statutFilter);

  const enriched = dossiers.map((d) => {
    const u = utilisateurs.find((x) => x.id === d.etudiant_id) || {};
    const f = d.formation_id ? formations.find((x) => x.id === d.formation_id) : null;
    const docs = documents.filter((x) => x.dossier_id === d.id);
    const q = qualiteScoreForDossier(d, docs, f);
    return {
      id: d.id,
      numero_dossier: d.numero_dossier,
      statut: d.statut,
      created_at: d.created_at,
      etudiant: { prenom: u.prenom, nom: u.nom, email: u.email, matricule: u.matricule },
      formation: f ? { titre: f.titre, type: f.type } : null,
      completude_pct: q.completude_pct,
      pieces_manquantes: q.pieces_manquantes,
    };
  });

  let filtered = enriched;
  if (Number.isFinite(minCompletude)) {
    filtered = enriched.filter((x) => x.completude_pct >= minCompletude);
  }

  filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const total = filtered.length;
  const slice = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    items: slice,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
});

module.exports = router;
