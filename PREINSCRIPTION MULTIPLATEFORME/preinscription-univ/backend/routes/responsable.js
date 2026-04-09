const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, responsableOrAdmin, staffLettreAttestation, staffProformaDecision } = require('../middleware/auth');
const { proformaDemandeDecision } = require('../services/proformaDemandeDecisionService');
const { genererOuRecupererFactureDossier } = require('../services/factureService');
const { snapshotFromFormation, snapshotFromEtablissementId } = require('../utils/etablissementSnapshot');
const { logAudit } = require('../utils/auditLog');
const { DOSSIER_STATUSES, canTransitionDossierStatus, requiresRejectionComment } = require('../utils/dossierWorkflow');
const { createUserNotification } = require('../utils/notificationService');
const { buildAttestationPayloadForDossier } = require('../utils/buildAttestationPayload');
const { isDossierAcceptePourLettre } = require('../utils/dossierLettreEligible');
const { primaryPhotoDocumentFromList } = require('../utils/preinscriptionDocumentRules');

// ─── Lettres / attestations (staff établissement, même périmètre que facture dossier) ─
// Enregistrées avant le guard responsableOrAdmin pour autoriser agent_admin, comptable, directeur.
router.get('/lettre/:dossierId', authMiddleware, staffLettreAttestation, (req, res) => {
  const id = parseInt(String(req.params.dossierId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant dossier invalide' });
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }
  if (!isDossierAcceptePourLettre(dossier.statut)) {
    return res.status(403).json({ message: 'La préinscription doit être acceptée pour générer la lettre.' });
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const formation = dossier.formation_id
    ? db.get('formations').find({ id: dossier.formation_id }).value()
    : null;
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const photoDoc = primaryPhotoDocumentFromList(documents);
  const etablissement =
    snapshotFromFormation(formation) || snapshotFromEtablissementId(u.etablissement_id);

  const y = new Date().getFullYear();
  const lettre_extensions = {
    reference_lettre: `LPI-${y}-${String(dossier.id).padStart(5, '0')}`,
    numero_dossier: dossier.numero_dossier,
    date_soumission: dossier.created_at,
    matricule_candidat: u.matricule || null,
    numero_passeport: dossier.numero_passeport || null,
  };

  res.json({
    type: 'dossier',
    dossier,
    etudiant: { nom: u.nom, prenom: u.prenom, email: u.email },
    formation,
    etablissement,
    photo_url: photoDoc ? `/uploads/${photoDoc.chemin}` : null,
    date_generation: new Date().toISOString(),
    lettre_extensions,
  });
});

router.get('/attestation/:dossierId', authMiddleware, staffLettreAttestation, (req, res) => {
  const id = parseInt(String(req.params.dossierId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant dossier invalide' });
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }
  const built = buildAttestationPayloadForDossier(id);
  if (built.error) {
    return res.status(built.error.status).json({ message: built.error.message });
  }
  res.json(built.body);
});

// ─── DEMANDES PROFORMA (staff établissement + admin — avant le guard responsable seul) ─
router.get('/demandes-proforma', authMiddleware, staffProformaDecision, (req, res) => {
  const { statut, type, page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  let demandes = db.get('demandes_proforma').value();
  const formationIds = getEtabFormationIds(req) || [];
  const etabId = req.user.role !== 'admin' ? req.user.etablissement_id : null;
  if (etabId) {
    demandes = demandes.filter((d) => demandeAppartientAEtablissement(d, etabId, formationIds));
  }

  if (statut) demandes = demandes.filter((d) => d.statut === statut);
  if (type) demandes = demandes.filter((d) => d.type_formation === type);

  demandes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = demandes.length;
  const paginated = demandes.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    demandes: paginated,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});

router.put('/demandes-proforma/:id/statut', authMiddleware, staffProformaDecision, (req, res) => {
  const { statut } = req.body;
  if (!['nouvelle', 'vue', 'traitee', 'en_attente'].includes(statut)) {
    return res.status(400).json({
      message:
        'Statut invalide. Utilisez la décision (accepter / refuser) pour clôturer une demande — pas ce champ.',
    });
  }
  const id = parseInt(req.params.id);
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  if (!assertDemandePourResponsable(req, demande)) {
    return res.status(403).json({ message: 'Cette demande ne concerne pas votre établissement.' });
  }

  const patch = { statut, updated_at: new Date().toISOString() };
  db.get('demandes_proforma').find({ id }).assign(patch).write();
  res.json({ message: 'Statut mis à jour' });
});

router.put('/demandes-proforma/:id/decision', authMiddleware, staffProformaDecision, (req, res) => {
  const id = parseInt(req.params.id);
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  if (!assertDemandePourResponsable(req, demande)) {
    return res.status(403).json({ message: 'Cette demande ne concerne pas votre établissement.' });
  }

  const { decision, motif_refus } = req.body;
  const result = proformaDemandeDecision({
    demandeId: id,
    userId: req.user.id,
    decision,
    motif_refus,
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  res.json({ message: result.message, demande: result.demande });
});

router.use(authMiddleware, responsableOrAdmin);

// ─── Helpers accès par établissement ─────────────────────────────────────────

function getEtabFormationIds(req) {
  const etabId = req.user.role !== 'admin' ? req.user.etablissement_id : null;
  if (!etabId) return null;
  return (db.get('formations').value() || []).filter((f) => f.etablissement_id === etabId).map((f) => f.id);
}

function dossierAppartientAEtablissement(dossier, etabId) {
  if (!etabId) return true;
  if (dossier.etablissement_id && dossier.etablissement_id === etabId) return true;
  if (dossier.formation_id) {
    const f = db.get('formations').find({ id: dossier.formation_id }).value();
    return f && f.etablissement_id === etabId;
  }
  return false;
}

function assertDossierPourResponsable(req, dossier) {
  if (req.user.role === 'admin') return true;
  return dossierAppartientAEtablissement(dossier, req.user.etablissement_id);
}

function demandeAppartientAEtablissement(demande, etabId, formationIds) {
  if (!etabId) return true;
  if (demande.etablissement_id === etabId) return true;
  if (!demande.etablissement_id && demande.formation_id && formationIds.includes(demande.formation_id)) return true;
  return false;
}

function assertDemandePourResponsable(req, demande) {
  if (req.user.role === 'admin') return true;
  const fIds = getEtabFormationIds(req) || [];
  return demandeAppartientAEtablissement(demande, req.user.etablissement_id, fIds);
}

// ─── DOSSIERS ────────────────────────────────────────────────────────────────

router.get('/dossiers', (req, res) => {
  const { type, statut, search, page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const formationIds = getEtabFormationIds(req);

  let dossiers = db.get('dossiers').value();
  const utilisateurs = db.get('utilisateurs').value();

  if (formationIds !== null) {
    dossiers = dossiers.filter(d => dossierAppartientAEtablissement(d, req.user.etablissement_id));
  }

  dossiers = dossiers.map(d => {
    const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
    return { ...d, nom: u.nom, prenom: u.prenom, email: u.email };
  });

  if (type === 'fad' || type === 'en_ligne') {
    dossiers = dossiers.filter(d => d.type_formation === 'en_ligne');
  } else if (type === 'presentiel') {
    dossiers = dossiers.filter(d => d.type_formation === 'presentiel');
  }
  if (statut) dossiers = dossiers.filter(d => d.statut === statut);
  if (search) {
    const s = search.toLowerCase();
    dossiers = dossiers.filter(d =>
      (d.nom || '').toLowerCase().includes(s) ||
      (d.prenom || '').toLowerCase().includes(s) ||
      (d.email || '').toLowerCase().includes(s) ||
      (d.numero_dossier || '').toLowerCase().includes(s) ||
      (d.filiere || '').toLowerCase().includes(s)
    );
  }

  dossiers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = dossiers.length;
  const paginated = dossiers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    dossiers: paginated,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
  });
});

router.get('/statistiques', (req, res) => {
  const formationIds = getEtabFormationIds(req);
  const etabId = req.user.role !== 'admin' ? req.user.etablissement_id : null;

  let dossiers = db.get('dossiers').value();
  if (formationIds !== null) {
    dossiers = dossiers.filter(d => dossierAppartientAEtablissement(d, etabId));
  }

  let demandes = db.get('demandes_proforma').value();
  if (etabId) {
    demandes = demandes.filter(d => demandeAppartientAEtablissement(d, etabId, formationIds));
  }

  const fad = dossiers.filter(d => d.type_formation === 'en_ligne');
  const presentiel = dossiers.filter(d => d.type_formation === 'presentiel');

  const counts = (arr) => ({
    total: arr.length,
    en_attente: arr.filter(d => d.statut === 'en_attente').length,
    en_cours: arr.filter(d => d.statut === 'en_cours').length,
    acceptes: arr.filter(d => d.statut === 'accepte').length,
    refuses: arr.filter(d => d.statut === 'refuse').length,
  });

  res.json({
    fad: counts(fad),
    presentiel: counts(presentiel),
    total: dossiers.length,
    demandes_proforma: demandes.length,
    nouvelles_demandes: demandes.filter(d => d.statut === 'nouvelle' || d.statut === 'en_attente').length
  });
});

router.get('/dossiers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const formation = db.get('formations').find({ id: dossier.formation_id }).value();
  const factureRow = db.get('factures').find({ dossier_id: id }).value() || null;
  const facture = factureRow ? genererOuRecupererFactureDossier(id) : null;

  res.json({
    dossier: { ...dossier, nom: u.nom, prenom: u.prenom, email: u.email, date_inscription: u.created_at },
    documents,
    formation,
    facture
  });
});

router.put('/dossiers/:id/statut', (req, res) => {
  const { statut, motif_rejet } = req.body;
  if (!statut || !DOSSIER_STATUSES.includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }
  if (!canTransitionDossierStatus(dossier.statut, statut)) {
    return res.status(400).json({ message: `Transition non autorisée: ${dossier.statut} -> ${statut}.` });
  }
  if (requiresRejectionComment(statut) && !String(motif_rejet || '').trim()) {
    return res.status(400).json({ message: 'Le motif de rejet est obligatoire.' });
  }

  const updateData = {
    statut,
    commentaire_admin: statut === 'refuse' ? (motif_rejet || null) : dossier.commentaire_admin,
    updated_at: new Date().toISOString(),
    traite_par: req.user.id,
    traite_le: new Date().toISOString()
  };

  if (statut === 'accepte') {
    updateData.lettre_generee = true;
    updateData.date_acceptation = new Date().toISOString();
  }

  db.get('dossiers').find({ id }).assign(updateData).write();
  if (dossier.etudiant_id) {
    const statusLabel = {
      en_attente: 'en attente',
      en_cours: 'en cours',
      accepte: 'accepté',
      refuse: 'refusé',
    }[statut] || statut;
    createUserNotification(dossier.etudiant_id, {
      type: 'dossier_statut',
      title: 'Décision sur votre dossier',
      message: `Le dossier ${dossier.numero_dossier} est maintenant: ${statusLabel}.`,
      link: '/dashboard',
      meta: { dossier_id: dossier.id, numero_dossier: dossier.numero_dossier, statut },
    });
  }
  logAudit(req, 'update_status', 'dossier', id, {
    from: dossier.statut,
    to: statut,
    motif_rejet: statut === 'refuse' ? String(motif_rejet || '').slice(0, 180) : null,
  });

  let facture = null;
  if (statut === 'accepte') {
    facture = genererOuRecupererFactureDossier(id);
  }

  res.json({
    message: statut === 'accepte'
      ? 'Préinscription acceptée. Lettre et facture proforma disponibles pour l\'étudiant.'
      : `Dossier mis à jour avec le statut : ${statut}`,
    lettre_disponible: statut === 'accepte',
    facture
  });
});

module.exports = router;
