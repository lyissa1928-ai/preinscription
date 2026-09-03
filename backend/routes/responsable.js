const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, staffLettreAttestation, staffProformaView, staffProformaDecision, staffDossierDecision, staffGuichet } = require('../middleware/auth');
const { proformaDemandeDecision, creerProformaPourEtudiant } = require('../services/proformaDemandeDecisionService');
const { genererOuRecupererFactureDossier } = require('../services/factureService');
const { snapshotFromEtab, snapshotFromFormation, snapshotFromEtablissementId } = require('../utils/etablissementSnapshot');
const { logAudit } = require('../utils/auditLog');
const { DOSSIER_STATUSES, canTransitionDossierStatus, requiresRejectionComment } = require('../utils/dossierWorkflow');
const { createUserNotification } = require('../utils/notificationService');
const { notifyDossierStatutChange, notifyFactureDossierGeneree } = require('../utils/transactionalEmail');
const { buildAttestationPayloadForDossier, buildAttestationPayloadForDemandeProforma } = require('../utils/buildAttestationPayload');
const { canIssueOfficialDocs } = require('../utils/canIssueOfficialDocs');
const { canIssueLettrePreinscription } = require('../utils/canIssueLettrePreinscription');
const { resolveCandidatIdentite } = require('../utils/candidatIdentite');
const { filterDossiersAffichables, assertDossierAffichable } = require('../utils/dossierVisibility');
const { primaryPhotoDocumentFromList } = require('../utils/preinscriptionDocumentRules');

// ─── Lettres / attestations (staff établissement, même périmètre que facture dossier) ─
// Enregistrées avant le guard staffDossierDecision.
router.get('/lettre/:dossierId', authMiddleware, staffLettreAttestation, (req, res) => {
  const id = parseInt(String(req.params.dossierId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant dossier invalide' });
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }
  if (!canIssueLettrePreinscription(dossier)) {
    return res.status(403).json({
      message:
        'La lettre de préinscription est réservée aux candidats étrangers acceptés ayant déposé une demande en ligne.',
    });
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const identite = resolveCandidatIdentite(dossier, u);
  const formation = dossier.formation_id
    ? db.get('formations').find({ id: dossier.formation_id }).value()
    : null;
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const photoDoc = primaryPhotoDocumentFromList(documents);
  const etablissement =
    snapshotFromFormation(formation) ||
    snapshotFromEtablissementId(dossier.etablissement_id || u.etablissement_id);

  const y = new Date().getFullYear();
  const lettre_extensions = {
    reference_lettre: `LPI-${y}-${String(dossier.id).padStart(5, '0')}`,
    numero_dossier: dossier.numero_dossier,
    date_soumission: dossier.created_at,
    matricule_candidat: identite.matricule || null,
    numero_passeport: identite.numero_passeport || null,
    nationalite: identite.nationalite || null,
    sexe: identite.sexe || null,
    niveau: formation?.niveau || dossier.formation_niveau_cible || null,
    duree: formation?.duree || null,
  };

  res.json({
    type: 'dossier',
    dossier,
    etudiant: { nom: identite.nom, prenom: identite.prenom, email: identite.email },
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

router.get('/attestation-demande/:demandeId', authMiddleware, staffLettreAttestation, (req, res) => {
  const id = parseInt(String(req.params.demandeId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant de demande invalide' });
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  if (!assertDemandePourResponsable(req, demande)) {
    return res.status(403).json({ message: 'Cette demande ne concerne pas votre établissement.' });
  }
  const built = buildAttestationPayloadForDemandeProforma(id);
  if (built.error) {
    return res.status(built.error.status).json({ message: built.error.message });
  }
  res.json(built.body);
});

// ─── DEMANDES PROFORMA (staff établissement + admin — avant le guard responsable seul) ─
router.get('/demandes-proforma', authMiddleware, staffProformaView, (req, res) => {
  const { statut, type, page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  let demandes = db.get('demandes_proforma').value();
  const formationIds = getEtabFadFormationIds(req) || [];
  const etabId = req.user.role === 'admin' ? null : req.user.etablissement_id;
  if (etabId) {
    demandes = demandes.filter((d) => demandeAppartientAEtablissement(d, etabId, formationIds));
  }
  const { filterDemandesParModaliteRole } = require('../utils/fadRoles');
  demandes = filterDemandesParModaliteRole(req.user, demandes);

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

router.put('/demandes-proforma/:id/statut', authMiddleware, staffProformaView, (req, res) => {
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

// POST /api/responsable/demandes-proforma/creer — proforma (responsable, comptable, admin)
router.post('/demandes-proforma/creer', authMiddleware, staffProformaDecision, async (req, res) => {
  const {
    etudiant_id,
    formation_id,
    prenom,
    nom,
    telephone,
    email,
    remise,
  } = req.body || {};
  const result = await creerProformaPourEtudiant({
    staffUser: req.user,
    etudiantId: etudiant_id,
    formationId: formation_id,
    prenom,
    nom,
    telephone,
    email,
    remise,
    buildEtabSnapshot: snapshotFromEtab,
  });
  if (!result.ok) return res.status(result.status).json({ message: result.message });

  logAudit(req, 'create', 'demande_proforma', result.demande.id, {
    reference: result.demande.reference,
    etudiant_id: result.demande.etudiant_id,
    formation_id: result.demande.formation_id,
    source: 'staff',
    mode: result.demande.etudiant_id ? 'compte_existant' : 'saisie_libre',
  });
  res.status(201).json({ message: result.message, demande: result.demande });
});

// POST /api/responsable/dossiers/guichet — préinscription accueil (même modèle que l'étudiant)
router.post('/dossiers/guichet', authMiddleware, staffGuichet, (req, res) => {
  const { creerDossierGuichet } = require('../services/staffGuichetDossierService');
  const result = creerDossierGuichet({ staffUser: req.user, body: req.body || {} });
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  logAudit(req, result.reused ? 'update' : 'create', 'dossier', result.dossier.id, {
    numero_dossier: result.dossier.numero_dossier,
    source: 'staff_guichet',
    reused: !!result.reused,
    facture_id: result.facture?.id || null,
  });
  res.status(result.reused ? 200 : 201).json({
    message: result.message,
    dossier: result.dossier,
    facture: result.facture,
    tarif: result.tarif,
    reused: !!result.reused,
  });
});

// GET /api/responsable/formations/:id/tarif — tarif catalogue (lecture seule)
router.get('/formations/:id/tarif', authMiddleware, staffGuichet, (req, res) => {
  const { tarifFromFormation } = require('../services/staffGuichetDossierService');
  const fid = parseInt(String(req.params.id), 10);
  const formation = db.get('formations').find({ id: fid }).value();
  if (!formation || formation.actif === false) {
    return res.status(404).json({ message: 'Formation introuvable.' });
  }
  if (req.user.role !== 'admin' && Number(req.user.etablissement_id) !== Number(formation.etablissement_id)) {
    return res.status(403).json({ message: 'Cette formation n’appartient pas à votre établissement.' });
  }
  res.json({
    formation: {
      id: formation.id,
      titre: formation.titre,
      niveau: formation.niveau,
      niveau_requis: formation.niveau_requis,
      duree: formation.duree,
      etablissement_id: formation.etablissement_id,
    },
    tarif: tarifFromFormation(formation),
  });
});

// GET /api/responsable/etudiants?search=&etablissement_id= — recherche d'étudiants
// pour la création de proforma (scopée à l'établissement du staff ; admin : tous).
router.get('/etudiants', authMiddleware, staffProformaDecision, (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const etabFiltre =
    req.user.role === 'admin'
      ? parseInt(String(req.query.etablissement_id || ''), 10)
      : Number(req.user.etablissement_id);

  let etudiants = db
    .get('utilisateurs')
    .value()
    .filter((u) => u.role === 'etudiant' && u.actif !== false);

  if (Number.isFinite(etabFiltre)) {
    // Un étudiant sans rattachement peut recevoir une proforma de n'importe quel établissement.
    etudiants = etudiants.filter(
      (u) => u.etablissement_id == null || Number(u.etablissement_id) === etabFiltre,
    );
  }

  if (search) {
    etudiants = etudiants.filter((u) =>
      [u.prenom, u.nom, u.email, u.matricule]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(search)),
    );
  }

  etudiants.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));

  res.json({
    etudiants: etudiants.slice(0, 20).map((u) => ({
      id: u.id,
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      matricule: u.matricule || null,
      etablissement_id: u.etablissement_id ?? null,
    })),
    total: etudiants.length,
  });
});

router.put('/demandes-proforma/:id/decision', authMiddleware, staffProformaDecision, async (req, res) => {
  const id = parseInt(req.params.id);
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  if (!assertDemandePourResponsable(req, demande)) {
    return res.status(403).json({ message: 'Cette demande ne concerne pas votre établissement.' });
  }

  const { decision, motif_refus, avec_cachet } = req.body;
  const result = await proformaDemandeDecision({
    demandeId: id,
    userId: req.user.id,
    decision,
    motif_refus,
    avec_cachet,
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  res.json({ message: result.message, demande: result.demande, email_envoye: result.email_envoye });
});

// POST /api/responsable/demandes-proforma/:id/envoyer-email — renvoyer le lien facture au candidat
router.post('/demandes-proforma/:id/envoyer-email', authMiddleware, staffProformaDecision, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  if (!assertDemandePourResponsable(req, demande)) {
    return res.status(403).json({ message: 'Cette demande ne concerne pas votre établissement.' });
  }
  if (demande.statut !== 'acceptee' || !demande.facture?.numero) {
    return res.status(400).json({ message: 'La facture proforma doit être générée avant l’envoi par e-mail.' });
  }
  if (!demande.email) {
    return res.status(400).json({ message: 'Aucune adresse e-mail sur cette demande.' });
  }
  const { notifyProformaDecision } = require('../utils/transactionalEmail');
  const ok = await notifyProformaDecision(demande, 'acceptee');
  if (!ok) {
    return res.status(503).json({ message: 'Envoi impossible (SMTP non configuré ou adresse invalide).' });
  }
  res.json({ message: `Facture proforma envoyée à ${demande.email}.` });
});

router.use(authMiddleware, staffDossierDecision);

// ─── Helpers accès par établissement ─────────────────────────────────────────

const {
  getFormationIdsForEtab,
  getFadFormationIdsForEtab,
  dossierEstFad,
  dossierAppartientAEtablissement: dossierScope,
  demandeAppartientAEtablissement: demandeScope,
  buildFormationsMap,
} = require('../utils/etablissementScope');

/** Pour responsable_fad / agent_fad : uniquement les formations FAD. */
function getEtabFadFormationIds(req) {
  if (req.user.role === 'admin') return null;
  const formations = db.get('formations').value();
  if (req.user.role === 'responsable_fad' || req.user.role === 'agent_fad') {
    return getFadFormationIdsForEtab(formations, req.user.etablissement_id);
  }
  return getFormationIdsForEtab(formations, req.user.etablissement_id);
}

/** Vérifie accès dossier pour staff FAD : dossier FAD + établissement. */
function assertDossierAccessFad(req, dossier) {
  if (req.user.role !== 'responsable_fad' && req.user.role !== 'agent_fad') return true;
  return dossierEstFad(dossier);
}

function getEtabFormationIds(req) {
  const etabId = req.user.role === 'admin' ? null : req.user.etablissement_id;
  return getFormationIdsForEtab(db.get('formations').value(), etabId);
}

const _formationsMap = () => buildFormationsMap(db.get('formations').value());

function dossierAppartientAEtablissement(dossier, etabId) {
  return dossierScope(dossier, etabId, _formationsMap());
}

function assertDossierPourResponsable(req, dossier) {
  if (req.user.role === 'admin') return true;
  if (!dossierAppartientAEtablissement(dossier, req.user.etablissement_id)) return false;
  // Staff FAD : dossiers FAD uniquement
  if (!assertDossierAccessFad(req, dossier)) return false;
  // Staff présentiel : exclure FAD
  const { isFadOnlyUser, userPeutVoirDossierParModalite } = require('../utils/fadRoles');
  if (!isFadOnlyUser(req.user) && req.user.role !== 'admin_etablissement') {
    if (!userPeutVoirDossierParModalite(req.user, dossier)) return false;
  }
  return true;
}

function demandeAppartientAEtablissement(demande, etabId, formationIds) {
  return demandeScope(demande, etabId, formationIds);
}

function assertDemandePourResponsable(req, demande) {
  if (req.user.role === 'admin') return true;
  const fIds = getEtabFadFormationIds(req) || [];
  if (!demandeAppartientAEtablissement(demande, req.user.etablissement_id, fIds)) return false;
  const { userPeutVoirDemandeParModalite } = require('../utils/fadRoles');
  return userPeutVoirDemandeParModalite(req.user, demande);
}

// ─── DOSSIERS ────────────────────────────────────────────────────────────────

router.get('/dossiers', (req, res) => {
  const { type, statut, search, page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const formationIds = getEtabFadFormationIds(req);
  const isFadOnly = req.user.role === 'responsable_fad' || req.user.role === 'agent_fad';
  const { filterDossiersParModaliteRole } = require('../utils/fadRoles');

  let dossiers = db.get('dossiers').value();
  const utilisateurs = db.get('utilisateurs').value();
  dossiers = filterDossiersAffichables(dossiers, utilisateurs);

  if (formationIds !== null) {
    dossiers = dossiers.filter(d => dossierAppartientAEtablissement(d, req.user.etablissement_id));
  }
  // Périmètre FAD / présentiel selon le rôle
  dossiers = filterDossiersParModaliteRole(req.user, dossiers);

  dossiers = dossiers.map(d => {
    const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
    const identite = resolveCandidatIdentite(d, u);
    return { ...d, ...identite };
  });

  if (type === 'fad' || type === 'en_ligne') {
    dossiers = dossiers.filter(d => d.type_formation === 'en_ligne');
  } else if (type === 'presentiel' && !isFadOnly) {
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
  const { topFormationsDemandees } = require('../utils/statsHelpers');
  const formationIds = getEtabFormationIds(req);
  const etabId = req.user.role === 'admin' ? null : req.user.etablissement_id;

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

  const global = counts(dossiers);

  const demandesSorted = [...demandes].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
  const demandes_recentes = demandesSorted.slice(0, 6).map((d) => ({
    id: d.id,
    reference: d.reference,
    prenom: d.prenom,
    nom: d.nom,
    email: d.email,
    telephone: d.telephone,
    formation_titre: d.formation_titre,
    type_formation: d.type_formation,
    statut: d.statut,
    montant_ttc: d.facture?.montant_ttc ?? null,
    created_at: d.created_at,
  }));

  const { isFactureSupprimee } = require('../utils/factureVisibility');
  let factures = db.get('factures').value() || [];
  if (etabId) {
    const formById = _formationsMap();
    factures = factures.filter((f) => {
      if (isFactureSupprimee(f)) return false;
      if (f.formation_id) {
        const fo = formById.get(f.formation_id) || formById.get(Number(f.formation_id));
        if (fo && Number(fo.etablissement_id) === Number(etabId)) return true;
      }
      if (f.dossier_id) {
        const dos = db.get('dossiers').find({ id: f.dossier_id }).value();
        if (dos && dossierAppartientAEtablissement(dos, etabId)) return true;
      }
      if (f.etablissement_snapshot?.id != null && Number(f.etablissement_snapshot.id) === Number(etabId)) {
        return true;
      }
      return false;
    });
  } else {
    factures = factures.filter((f) => !isFactureSupprimee(f));
  }
  factures.sort((a, b) => new Date(b.date_emission || 0) - new Date(a.date_emission || 0));
  const factures_recentes = factures.slice(0, 6).map((f) => {
    const et = f.etudiant_snapshot || {};
    return {
      id: f.id,
      numero: f.numero,
      prenom: et.prenom,
      nom: et.nom,
      formation_titre: f.formation_snapshot?.titre || null,
      montant_ttc: f.montant_ttc,
      statut: f.statut,
      date_emission: f.date_emission,
      dossier_id: f.dossier_id || null,
    };
  });
  const montant_total = factures.reduce((s, f) => s + (Number(f.montant_ttc) || 0), 0);

  res.json({
    fad: counts(fad),
    presentiel: counts(presentiel),
    total: dossiers.length,
    taux_acceptation_pct: global.acceptes + global.refuses > 0
      ? Math.round((global.acceptes / (global.acceptes + global.refuses)) * 1000) / 10
      : null,
    demandes_proforma: demandes.length,
    nouvelles_demandes: demandes.filter(d => d.statut === 'nouvelle' || d.statut === 'en_attente').length,
    formations_plus_demandees: topFormationsDemandees(demandes, 8),
    demandes_recentes,
    factures: { total: factures.length, montant_total },
    factures_recentes,
  });
});

router.get('/dossiers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  const vis = assertDossierAffichable(dossier, db.get('utilisateurs').value());
  if (!vis.ok) return res.status(vis.status).json({ message: vis.message });
  if (!assertDossierPourResponsable(req, dossier)) {
    return res.status(403).json({ message: 'Ce dossier ne concerne pas votre établissement.' });
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const identite = resolveCandidatIdentite(dossier, u);
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const formation = db.get('formations').find({ id: dossier.formation_id }).value();
  const factureRow = db.get('factures').find({ dossier_id: id }).value() || null;
  const { isDossierAcceptePourLettre } = require('../utils/dossierLettreEligible');
  const facture =
    (isDossierAcceptePourLettre(dossier.statut) && dossier.formation_id)
      ? genererOuRecupererFactureDossier(id)
      : (factureRow ? genererOuRecupererFactureDossier(id) : null);

  res.json({
    dossier: {
      ...dossier,
      prenom: identite.prenom || null,
      nom: identite.nom || null,
      email: identite.email || null,
      telephone: identite.telephone || dossier.telephone || null,
      date_naissance: identite.date_naissance || dossier.date_naissance || null,
      lieu_naissance: identite.lieu_naissance || dossier.lieu_naissance || null,
      nationalite: identite.nationalite || dossier.nationalite || null,
      adresse: identite.adresse || dossier.adresse || null,
      matricule: identite.matricule || null,
      date_inscription: u.created_at || dossier.created_at || null,
    },
    documents,
    formation,
    facture
  });
});

router.put('/dossiers/:id/statut', async (req, res) => {
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
  const dossierAfter = { ...dossier, ...updateData };
  await notifyDossierStatutChange(dossierAfter, statut);

  logAudit(req, 'update_status', 'dossier', id, {
    from: dossier.statut,
    to: statut,
    motif_rejet: statut === 'refuse' ? String(motif_rejet || '').slice(0, 180) : null,
    actor_role: req.user.role,
    actor_id: req.user.id,
    visible_admin: true,
  });

  let facture = null;
  if (statut === 'accepte') {
    facture = genererOuRecupererFactureDossier(id);
    if (facture) {
      await notifyFactureDossierGeneree(dossierAfter, facture);
      if (dossier.etudiant_id) {
        createUserNotification(dossier.etudiant_id, {
          type: 'facture',
          title: 'Facture proforma disponible',
          message: `La facture ${facture.numero} a été générée pour le dossier ${dossier.numero_dossier}.`,
          link: `/facture/${id}`,
          meta: { dossier_id: id, facture_id: facture.id, numero: facture.numero },
        });
      }
    }
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
