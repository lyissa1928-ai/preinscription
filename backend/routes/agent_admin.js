const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, agentAdminOrAdmin } = require('../middleware/auth');
const {
  normalizePreinscriptionNiveau,
  getDocumentChecklistDefinition,
  computeMissingDocumentTypes,
} = require('../utils/preinscriptionDocumentRules');

router.use(authMiddleware, agentAdminOrAdmin);

function docsMetaForDossier(dossier, documents) {
  const profile = dossier.document_rule_profile || normalizePreinscriptionNiveau(dossier.formation_niveau_cible);
  const def = getDocumentChecklistDefinition(profile, dossier.nationalite);
  const docs_requis = [...def.required, ...def.identityKeys];
  const docs_manquants = computeMissingDocumentTypes(
    documents,
    profile,
    dossier.nationalite,
  );
  return { docs_requis, docs_manquants, document_rule_profile: profile };
}

// Helper : filtrer les dossiers par établissement
function filterDossiersByEtab(req, dossiers) {
  const etabId = req.user.role !== 'admin' ? req.user.etablissement_id : null;
  if (!etabId) return dossiers;
  const formationIds = db.get('formations').filter({ etablissement_id: etabId }).value().map(f => f.id);
  return dossiers.filter(d => {
    if (d.etablissement_id) return d.etablissement_id === etabId;
    if (d.formation_id) return formationIds.includes(d.formation_id);
    return false;
  });
}

// ─── GET /api/agent-admin/dashboard ──────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  const dossiers = filterDossiersByEtab(req, db.get('dossiers').value());
  const docs = db.get('documents').value();

  const enrichis = dossiers.map((d) => {
    const dDocs = docs.filter((doc) => doc.dossier_id === d.id);
    const docsIds = dDocs.map((doc) => doc.type_document);
    const { docs_manquants } = docsMetaForDossier(d, dDocs);
    return { ...d, nb_documents: docsIds.length, docs_manquants };
  });

  const recents = [...enrichis]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)
    .map(d => {
      const u = db.get('utilisateurs').find({ id: d.etudiant_id }).value() || {};
      return {
        id: d.id, numero_dossier: d.numero_dossier, statut: d.statut,
        statut_admin: d.statut_admin, nb_documents: d.nb_documents,
        docs_manquants: d.docs_manquants, created_at: d.created_at,
        nom: u.nom, prenom: u.prenom
      };
    });

  res.json({
    total: dossiers.length,
    complets: dossiers.filter(d => d.statut_admin === 'complet').length,
    incomplets: dossiers.filter(d => d.statut_admin === 'incomplet').length,
    en_verification: dossiers.filter(d => d.statut_admin === 'en_verification').length,
    non_verifies: dossiers.filter(d => !d.statut_admin).length,
    recents
  });
});

// ─── GET /api/agent-admin/dossiers ───────────────────────────────────────────
router.get('/dossiers', (req, res) => {
  const { statut_admin, statut, search, page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const docs = db.get('documents').value();
  const utilisateurs = db.get('utilisateurs').value();

  let dossiers = filterDossiersByEtab(req, db.get('dossiers').value()).map((d) => {
    const u = utilisateurs.find((x) => x.id === d.etudiant_id) || {};
    const dDocs = docs.filter((doc) => doc.dossier_id === d.id);
    const docsIds = dDocs.map((doc) => doc.type_document);
    const { docs_manquants } = docsMetaForDossier(d, dDocs);
    return { ...d, nom: u.nom, prenom: u.prenom, email: u.email, nb_documents: docsIds.length, docs_manquants };
  });

  if (statut_admin) dossiers = dossiers.filter(d => d.statut_admin === statut_admin);
  if (statut) dossiers = dossiers.filter(d => d.statut === statut);
  if (search) {
    const s = search.toLowerCase();
    dossiers = dossiers.filter(d =>
      (d.nom || '').toLowerCase().includes(s) ||
      (d.prenom || '').toLowerCase().includes(s) ||
      (d.numero_dossier || '').toLowerCase().includes(s)
    );
  }

  dossiers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = dossiers.length;
  const paginated = dossiers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ dossiers: paginated, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
});

// ─── GET /api/agent-admin/dossiers/:id ───────────────────────────────────────
router.get('/dossiers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const formation = db.get('formations').find({ id: dossier.formation_id }).value();

  const { docs_requis, docs_manquants } = docsMetaForDossier(dossier, documents);

  res.json({
    dossier: { ...dossier, nom: u.nom, prenom: u.prenom, email: u.email },
    documents,
    formation,
    docs_manquants,
    docs_requis,
  });
});

// ─── PUT /api/agent-admin/dossiers/:id/completude ────────────────────────────
router.put('/dossiers/:id/completude', (req, res) => {
  const { statut_admin, remarque_admin } = req.body;
  const statutsValides = ['complet', 'incomplet', 'en_verification'];
  if (!statutsValides.includes(statut_admin)) {
    return res.status(400).json({ message: 'Statut administratif invalide.' });
  }

  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  db.get('dossiers').find({ id }).assign({
    statut_admin,
    remarque_admin: remarque_admin || null,
    verifie_par: req.user.id,
    verifie_par_nom: `${req.user.prenom || ''} ${req.user.nom || ''}`.trim(),
    verifie_le: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).write();

  res.json({ message: `Dossier marqué comme : ${statut_admin}` });
});

module.exports = router;
