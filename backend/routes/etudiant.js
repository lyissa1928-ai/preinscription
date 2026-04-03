const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database/db');
const { unlinkQuiet } = require('../utils/verifyUploadedFile');
const { authMiddleware } = require('../middleware/auth');
const { snapshotFromFormation, snapshotFromEtablissementId } = require('../utils/etablissementSnapshot');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { logSecurityEvent } = require('../utils/securityEvent');
const { antiBotConfig, verifyTurnstileToken } = require('../utils/antiBot');
const {
  normalizePreinscriptionNiveau,
  validateDossierUploadsForNiveau,
  DOSSIER_UPLOAD_FIELD_NAMES,
} = require('../utils/preinscriptionDocumentRules');
const { processAndPersistDossierFile } = require('../utils/secureDossierUpload');
const { buildAttestationPayloadForDossier } = require('../utils/buildAttestationPayload');
const { isDossierAcceptePourLettre } = require('../utils/dossierLettreEligible');
const { genererOuRecupererFactureDossier } = require('../services/factureService');
const { mergeFactureProformaFromFormation, getDureeMoisEffectif } = require('../utils/formationTarifs');

const uploadsStudentDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.bin';
    cb(null, `tmp_${Date.now()}_${Math.round(Math.random() * 1e12)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Format non autorisé. Utilisez PDF, JPG ou PNG'));
  },
});

const dossierUploadFields = DOSSIER_UPLOAD_FIELD_NAMES.map((name) => ({ name, maxCount: 1 }));

function cleanupDossierFiles(reqFiles, securedMap) {
  if (reqFiles) {
    for (const [, fs2] of Object.entries(reqFiles)) {
      unlinkQuiet(path.join(uploadsStudentDir, fs2[0].filename));
    }
  }
  if (securedMap) {
    for (const v of Object.values(securedMap)) {
      if (v?.finalName) unlinkQuiet(path.join(uploadsStudentDir, v.finalName));
    }
  }
}

const dossierSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Trop de tentatives de soumission. Réessayez dans quelques minutes.',
  keyGenerator: (req) => `dossier_submit:${getClientIp(req)}:${req.user?.id || 'anon'}`,
});

function genererNumeroDossier() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `PREINSC-${year}-${rand}`;
}

// POST /api/etudiant/dossier
router.post(
  '/dossier',
  authMiddleware,
  dossierSubmitLimiter,
  (req, res, next) => {
    upload.fields(dossierUploadFields)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Chaque document est limité à 2 Mo.' });
        }
        return res.status(400).json({ message: err.message || 'Erreur lors de l’envoi des fichiers.' });
      }
      next();
    });
  },
  async (req, res) => {
  const etudiantId = req.user.id;
  const abortUploads = (code, payload) => {
    cleanupDossierFiles(req.files, null);
    return res.status(code).json(payload);
  };

  const botHoneypot = String(req.body?.website || '').trim();
  if (botHoneypot) {
    logSecurityEvent(req, 'bot_honeypot_triggered', { endpoint: '/api/etudiant/dossier' }, 'warning');
    return abortUploads(400, { message: 'Requête invalide.' });
  }

  const { secret, requireCaptcha, minFillMs } = antiBotConfig();
  const startedAtRaw = Number(req.body?.bot_started_at || 0);
  const filledTooFast = !Number.isFinite(startedAtRaw) || startedAtRaw <= 0 || (Date.now() - startedAtRaw) < minFillMs;
  if (filledTooFast) {
    logSecurityEvent(req, 'bot_too_fast_submission', {
      endpoint: '/api/etudiant/dossier',
      min_fill_ms: minFillMs,
      elapsed_ms: Number.isFinite(startedAtRaw) ? Date.now() - startedAtRaw : null,
    }, 'warning');
    return abortUploads(400, { message: 'Soumission trop rapide. Veuillez réessayer.' });
  }

  if (requireCaptcha) {
    const token = String(req.body?.bot_token || '').trim();
    if (!token) {
      logSecurityEvent(req, 'bot_missing_captcha_token', { endpoint: '/api/etudiant/dossier' }, 'warning');
      return abortUploads(400, { message: 'Vérification anti-bot requise.' });
    }
    const ok = await verifyTurnstileToken(token, getClientIp(req), secret);
    if (!ok) {
      logSecurityEvent(req, 'bot_captcha_verification_failed', { endpoint: '/api/etudiant/dossier' }, 'warning');
      return abortUploads(400, { message: 'Vérification anti-bot invalide. Réessayez.' });
    }
  }

  const {
    formation_id, annee_academique, date_naissance, lieu_naissance,
    nationalite, telephone, adresse, dernier_diplome, etablissement_origine, mention, annee_obtention,
    numero_passeport,
  } = req.body;

  if (!formation_id || !annee_academique || !date_naissance || !lieu_naissance ||
      !nationalite || !telephone || !adresse || !dernier_diplome || !etablissement_origine || !annee_obtention) {
    return abortUploads(400, { message: 'Tous les champs obligatoires doivent être remplis' });
  }

  const fid = parseInt(String(formation_id), 10);
  if (!Number.isFinite(fid)) {
    return abortUploads(400, { message: 'Formation invalide' });
  }
  const dossiersEtudiant = db.get('dossiers').value().filter((d) => Number(d.etudiant_id) === Number(etudiantId));
  const pourCetteFormation = dossiersEtudiant.filter((d) => Number(d.formation_id) === fid);
  const enCours = pourCetteFormation.find((d) => ['en_attente', 'en_cours'].includes(d.statut));
  if (enCours) {
    return abortUploads(409, {
      message: 'Vous avez déjà une candidature en cours pour cette formation. Suivez son statut depuis votre espace.',
    });
  }
  const dejaAccepte = pourCetteFormation.find((d) => d.statut === 'accepte');
  if (dejaAccepte) {
    return abortUploads(409, { message: 'Vous avez déjà été accepté pour cette formation.' });
  }

  const existsFo = db.get('formations').find({ id: fid }).value();
  if (!existsFo) return abortUploads(404, { message: 'Formation introuvable ou identifiant invalide.' });
  if (existsFo.actif === false) {
    return abortUploads(404, { message: 'Cette formation n’est plus proposée (désactivée).' });
  }
  const formation = existsFo;

  const etudiantRow = db.get('utilisateurs').find({ id: etudiantId }).value();
  if (!etudiantRow?.etablissement_id) {
    return abortUploads(403, { message: 'Votre compte doit être rattaché à un établissement pour postuler.' });
  }
  if (String(formation.etablissement_id) !== String(etudiantRow.etablissement_id)) {
    return abortUploads(403, { message: 'Vous ne pouvez postuler qu\'aux formations de l\'établissement choisi à l\'inscription.' });
  }

  const documentRuleProfile = normalizePreinscriptionNiveau(formation.niveau);
  const rulesCheck = validateDossierUploadsForNiveau(
    req.files,
    documentRuleProfile,
    nationalite,
  );
  if (!rulesCheck.ok) {
    cleanupDossierFiles(req.files, null);
    return res.status(400).json({
      message: rulesCheck.message || 'Dossier incomplet.',
      missing_documents: rulesCheck.missingKeys,
    });
  }

  /** @type {Record<string, { finalName: string, originalname: string }>} */
  const securedByField = {};
  try {
    for (const [type, files] of Object.entries(req.files || {})) {
      const file = files[0];
      const tempAbs = path.join(uploadsStudentDir, file.filename);
      const out = await processAndPersistDossierFile({
        uploadsDir: uploadsStudentDir,
        tempAbsPath: tempAbs,
        originalname: file.originalname,
        niveauKey: documentRuleProfile,
        fieldKey: type,
      });
      if (!out.ok) {
        throw new Error(out.message || 'Fichier invalide.');
      }
      securedByField[type] = { finalName: out.finalName, originalname: file.originalname };
    }
  } catch (e) {
    cleanupDossierFiles(req.files, securedByField);
    return res.status(400).json({ message: e.message || 'Fichier invalide.' });
  }

  const id = db.nextId('dossiers');
  const numeroDossier = genererNumeroDossier();
  const now = new Date().toISOString();

  const passeportTrim = numero_passeport != null ? String(numero_passeport).trim() : '';
  const dossier = {
    id, etudiant_id: etudiantId, numero_dossier: numeroDossier,
    formation_id: parseInt(formation_id),
    type_formation: formation.type,
    filiere: formation.titre,
    niveau: formation.niveau_requis,
    formation_niveau_cible: formation.niveau != null ? String(formation.niveau) : null,
    document_rule_profile: documentRuleProfile,
    annee_academique,
    date_naissance, lieu_naissance, nationalite, telephone, adresse,
    dernier_diplome, etablissement_origine, mention: mention || null,
    annee_obtention: parseInt(annee_obtention),
    ...(passeportTrim ? { numero_passeport: passeportTrim } : {}),
    statut: 'en_attente', commentaire_admin: null,
    created_at: now, updated_at: now
  };
  db.get('dossiers').push(dossier).write();

  for (const [type, meta] of Object.entries(securedByField)) {
    const docId = db.nextId('documents');
    db.get('documents')
      .push({
        id: docId,
        dossier_id: id,
        type_document: type,
        nom_fichier: meta.originalname,
        chemin: meta.finalName,
        created_at: now,
      })
      .write();
  }

  res.status(201).json({ message: 'Dossier soumis avec succès', numero_dossier: numeroDossier, dossier_id: id });
  },
);

function packDossierPayload(dossier) {
  const documents = db.get('documents').filter({ dossier_id: dossier.id }).value();
  const formation = db.get('formations').find({ id: dossier.formation_id }).value();
  const factureRow = db.get('factures').find({ dossier_id: dossier.id }).value() || null;
  const facture = factureRow ? genererOuRecupererFactureDossier(dossier.id) : null;
  return { dossier, documents, formation, facture };
}

// GET /api/etudiant/dossiers — toutes les candidatures de l'étudiant (plusieurs formations possibles)
router.get('/dossiers', authMiddleware, (req, res) => {
  const list = db
    .get('dossiers')
    .value()
    .filter((d) => Number(d.etudiant_id) === Number(req.user.id));
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ dossiers: list.map(packDossierPayload) });
});

// GET /api/etudiant/dossier — compat : dernier dossier créé (le plus récent)
router.get('/dossier', authMiddleware, (req, res) => {
  const list = db
    .get('dossiers')
    .value()
    .filter((d) => Number(d.etudiant_id) === Number(req.user.id));
  if (!list.length) return res.status(404).json({ message: 'Aucun dossier trouvé' });
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(packDossierPayload(list[0]));
});

// GET /api/etudiant/profil
router.get('/profil', authMiddleware, (req, res) => {
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const { mot_de_passe, ...safeUser } = user;
  res.json(safeUser);
});

// GET /api/etudiant/demandes-proforma — demandes liées à l'email du compte
router.get('/demandes-proforma', authMiddleware, (req, res) => {
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const email = (user.email || '').toLowerCase();
  const list = db.get('demandes_proforma').value().filter(d => (d.email || '').toLowerCase() === email);
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

// GET /api/etudiant/notifications?limit=20
router.get('/notifications', authMiddleware, (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || 20, 10) || 20, 1), 100);
  const items = (db.get('notifications').value() || [])
    .filter((n) => Number(n.user_id) === Number(req.user.id))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit);
  const unread = items.filter((x) => !x.read_at).length;
  res.json({ items, unread });
});

// POST /api/etudiant/notifications/read-all
router.post('/notifications/read-all', authMiddleware, (req, res) => {
  const all = db.get('notifications').value() || [];
  const unread = all.filter((n) => Number(n.user_id) === Number(req.user.id) && !n.read_at);
  const now = new Date().toISOString();
  unread.forEach((n) => {
    db.get('notifications').find({ id: n.id }).assign({ read_at: now }).write();
  });
  res.json({ message: 'Notifications marquées comme lues.', updated: unread.length });
});

// GET /api/etudiant/lettre/:dossierId — même contenu que responsable, propriétaire du dossier uniquement
router.get('/lettre/:dossierId', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.dossierId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant dossier invalide' });
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (Number(dossier.etudiant_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (!isDossierAcceptePourLettre(dossier.statut)) {
    return res.status(403).json({ message: 'La préinscription doit être acceptée pour afficher la lettre.' });
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const formation = dossier.formation_id
    ? db.get('formations').find({ id: dossier.formation_id }).value()
    : null;
  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const photoDoc = documents.find(d => d.type_document === 'photo');
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

// GET /api/etudiant/attestation/:dossierId — attestation officielle (candidature acceptée uniquement)
router.get('/attestation/:dossierId', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.dossierId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant dossier invalide' });
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (Number(dossier.etudiant_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const built = buildAttestationPayloadForDossier(id);
  if (built.error) {
    return res.status(built.error.status).json({ message: built.error.message });
  }
  res.json(built.body);
});

// GET /api/etudiant/lettre-demande/:demandeId — lettre pour demande proforma acceptée (même email)
router.get('/lettre-demande/:demandeId', authMiddleware, (req, res) => {
  const id = parseInt(req.params.demandeId);
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user || (user.email || '').toLowerCase() !== (demande.email || '').toLowerCase()) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (demande.statut !== 'acceptee') {
    return res.status(403).json({ message: 'Cette demande n\'a pas été acceptée.' });
  }

  const formation = db.get('formations').find({ id: demande.formation_id }).value();
  const etabSnap = demande.etablissement_snapshot || snapshotFromFormation(formation);
  let demandeOut = demande;
  if (formation && demande.facture) {
    demandeOut = {
      ...demande,
      facture: mergeFactureProformaFromFormation(formation, demande.facture),
      formation_mensualite: formation.mensualite ?? demande.formation_mensualite,
      formation_duree_mois: getDureeMoisEffectif(formation),
    };
  }
  res.json({
    type: 'demande',
    demande: demandeOut,
    formation,
    lettre: demande.lettre_preinscription || null,
    etablissement_snapshot: etabSnap,
    date_generation: new Date().toISOString()
  });
});

module.exports = router;
