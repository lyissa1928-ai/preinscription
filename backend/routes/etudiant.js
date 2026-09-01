const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { unlinkQuiet, detectDossierMagicFormat } = require('../utils/verifyUploadedFile');
const { authMiddleware } = require('../middleware/auth');
const { snapshotFromFormation, snapshotFromEtablissementId } = require('../utils/etablissementSnapshot');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { logSecurityEvent } = require('../utils/securityEvent');
const {
  antiBotConfig,
  verifyRecaptchaTokenWithDetails,
  verifyRecaptchaEnterpriseWithDetails,
  recaptchaEnterpriseConfigured,
  recaptchaSecret,
} = require('../utils/antiBot');
const {
  normalizePreinscriptionNiveau,
  normalizeNombrePhotosPreinscription,
  photoSlotKeysForCount,
  primaryPhotoDocumentFromList,
  validateDossierUploadsForNiveau,
  DOSSIER_UPLOAD_FIELD_NAMES,
} = require('../utils/preinscriptionDocumentRules');
const { processAndPersistDossierFile } = require('../utils/secureDossierUpload');
const { buildAttestationPayloadForDossier, buildAttestationPayloadForDemandeProforma } = require('../utils/buildAttestationPayload');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { canIssueOfficialDocs } = require('../utils/canIssueOfficialDocs');
const { canIssueLettrePreinscription } = require('../utils/canIssueLettrePreinscription');
const { resolveCandidatIdentite } = require('../utils/candidatIdentite');
const { genererOuRecupererFactureDossier } = require('../services/factureService');
const { isDossierAcceptePourLettre } = require('../utils/dossierLettreEligible');
const { getDureeMoisEffectif } = require('../utils/formationTarifs');

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

/** Photo d’identité : images uniquement (pas de PDF). */
const uploadPhotoOnly = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) cb(null, true);
    else cb(new Error('Pour la photo d’identité, utilisez une image JPG ou PNG.'));
  },
});

const dossierUploadFields = DOSSIER_UPLOAD_FIELD_NAMES.map((name) => ({ name, maxCount: 1 }));

const {
  proformaJustificatifFieldsCompte,
  cleanupProformaUploads,
  persistProformaJustificatif,
} = require('../utils/proformaUpload');

const proformaSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Trop de demandes. Réessayez dans quelques minutes.',
  keyGenerator: (req) => `proforma_submit:${getClientIp(req)}:${req.user?.id || 'anon'}`,
});

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

const dossierPhotoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 24,
  message: 'Trop d’envois de photo. Réessayez dans quelques minutes.',
  keyGenerator: (req) => `dossier_photo:${getClientIp(req)}:${req.user?.id || 'anon'}`,
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

  const { requireCaptcha, minFillMs } = antiBotConfig();
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
    const useEnterprise = recaptchaEnterpriseConfigured();
    const recSecret = recaptchaSecret();
    const recToken = String(req.body?.recaptcha_token || '').trim();
    if (!recToken) {
      logSecurityEvent(req, 'recaptcha_missing_token', { endpoint: '/api/etudiant/dossier' }, 'warning');
      return abortUploads(400, { message: 'reCAPTCHA requis.' });
    }
    if (useEnterprise || recSecret) {
      const recResult = useEnterprise
        ? await verifyRecaptchaEnterpriseWithDetails(recToken)
        : await verifyRecaptchaTokenWithDetails(recToken, getClientIp(req), recSecret);
      if (!recResult.ok) {
        logSecurityEvent(req, 'recaptcha_verification_failed', {
          endpoint: '/api/etudiant/dossier',
          recaptcha_mode: useEnterprise ? 'enterprise' : 'legacy',
          recaptcha_error_codes: recResult.errorCodes || [],
        }, 'warning');
        return abortUploads(400, { message: 'reCAPTCHA invalide ou expiré. Réessayez.' });
      }
    } else {
      logSecurityEvent(req, 'dossier_captcha_not_configured', { endpoint: '/api/etudiant/dossier' }, 'error');
      return abortUploads(503, {
        message: 'Soumission temporairement indisponible (reCAPTCHA non configuré sur le serveur).',
      });
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
  const dossiersEtudiant = (db.get('dossiers').value() || []).filter((d) => Number(d.etudiant_id) === Number(etudiantId));
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
  const nombrePhotosFormation = normalizeNombrePhotosPreinscription(formation.nombre_photos_preinscription);
  const rulesCheck = validateDossierUploadsForNiveau(
    req.files,
    documentRuleProfile,
    nationalite,
    nombrePhotosFormation,
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

  for (const pk of photoSlotKeysForCount(nombrePhotosFormation)) {
    if (!securedByField[pk]) continue;
    const photoPath = path.join(uploadsStudentDir, securedByField[pk].finalName);
    let buf;
    try {
      buf = fs.readFileSync(photoPath);
    } catch {
      cleanupDossierFiles(req.files, securedByField);
      return res.status(400).json({ message: 'Photo d’identité illisible.' });
    }
    const magic = detectDossierMagicFormat(buf);
    if (magic !== 'jpeg' && magic !== 'png') {
      cleanupDossierFiles(req.files, securedByField);
      return res.status(400).json({
        message: 'La photo d’identité doit être une image JPG ou PNG (pas un PDF).',
      });
    }
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
    prenom: etudiantRow.prenom || null,
    nom: etudiantRow.nom || null,
    email: etudiantRow.email || null,
    etablissement_id: formation.etablissement_id,
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
  const accepte = isDossierAcceptePourLettre(dossier.statut);
  let facture = null;
  if (accepte && dossier.formation_id) {
    facture = genererOuRecupererFactureDossier(dossier.id);
  } else {
    const factureRow = db.get('factures').find({ dossier_id: dossier.id }).value() || null;
    if (factureRow) facture = genererOuRecupererFactureDossier(dossier.id);
  }
  return {
    dossier,
    documents,
    formation,
    facture,
    documents_officiels: {
      facture: accepte,
      attestation: accepte,
      lettre: canIssueLettrePreinscription(dossier),
    },
  };
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

// POST /api/etudiant/dossiers/:dossierId/photo — remplacer la photo d’identité (dossier en attente / en cours uniquement)
router.post(
  '/dossiers/:dossierId/photo',
  authMiddleware,
  dossierPhotoLimiter,
  (req, res, next) => {
    uploadPhotoOnly.single('photo')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'La photo est limitée à 2 Mo.' });
        }
        return res.status(400).json({ message: err.message || 'Erreur lors de l’envoi du fichier.' });
      }
      next();
    });
  },
  async (req, res) => {
    if (req.user.role !== 'etudiant') {
      if (req.file?.path) unlinkQuiet(req.file.path);
      return res.status(403).json({ message: 'Réservé aux comptes étudiants.' });
    }
    const dossierId = parseInt(String(req.params.dossierId), 10);
    if (!Number.isFinite(dossierId)) {
      if (req.file?.path) unlinkQuiet(req.file.path);
      return res.status(400).json({ message: 'Identifiant dossier invalide.' });
    }
    const dossier = db.get('dossiers').find({ id: dossierId }).value();
    if (!dossier) {
      if (req.file?.path) unlinkQuiet(req.file.path);
      return res.status(404).json({ message: 'Dossier non trouvé.' });
    }
    if (Number(dossier.etudiant_id) !== Number(req.user.id)) {
      if (req.file?.path) unlinkQuiet(req.file.path);
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }
    const statutsPhotoModifiables = ['en_attente', 'en_cours'];
    if (!statutsPhotoModifiables.includes(dossier.statut)) {
      if (req.file?.path) unlinkQuiet(req.file.path);
      return res.status(400).json({
        message:
          'La photo ne peut être modifiée que tant que le dossier est en attente ou en cours d’examen.',
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Veuillez sélectionner une photo (JPG ou PNG).' });
    }

    const documentRuleProfile = normalizePreinscriptionNiveau(
      dossier.formation_niveau_cible || dossier.document_rule_profile || 'generic',
    );
    const tempAbs = path.join(uploadsStudentDir, req.file.filename);
    let out;
    try {
      out = await processAndPersistDossierFile({
        uploadsDir: uploadsStudentDir,
        tempAbsPath: tempAbs,
        originalname: req.file.originalname,
        niveauKey: documentRuleProfile,
        fieldKey: 'photo_1',
      });
    } catch (e) {
      unlinkQuiet(tempAbs);
      return res.status(400).json({ message: e.message || 'Fichier invalide.' });
    }
    if (!out.ok) {
      unlinkQuiet(tempAbs);
      return res.status(400).json({ message: out.message || 'Fichier invalide.' });
    }

    const allDocs = db.get('documents').value() || [];
    const oldPhotos = allDocs.filter(
      (d) =>
        d.dossier_id === dossierId &&
        (d.type_document === 'photo_1' || d.type_document === 'photo'),
    );
    for (const old of oldPhotos) {
      unlinkQuiet(path.join(uploadsStudentDir, old.chemin));
      db.get('documents').remove({ id: old.id }).write();
    }

    const now = new Date().toISOString();
    const docId = db.nextId('documents');
    db.get('documents')
      .push({
        id: docId,
        dossier_id: dossierId,
        type_document: 'photo_1',
        nom_fichier: req.file.originalname,
        chemin: out.finalName,
        created_at: now,
      })
      .write();

    res.json({
      message: 'Photo d’identité mise à jour.',
      document: {
        id: docId,
        dossier_id: dossierId,
        type_document: 'photo_1',
        nom_fichier: req.file.originalname,
        chemin: out.finalName,
        created_at: now,
      },
    });
  },
);

// POST /api/etudiant/demande-proforma — justificatifs + mise en attente validation pédagogique
router.post(
  '/demande-proforma',
  authMiddleware,
  proformaSubmitLimiter,
  (req, res, next) => {
    upload.fields(proformaJustificatifFieldsCompte)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Chaque document est limité à 2 Mo.' });
        }
        return res.status(400).json({ message: err.message || 'Erreur lors de l’envoi des fichiers.' });
      }
      next();
    });
  },
  (req, res) => {
    if (req.user.role !== 'etudiant') {
      cleanupProformaUploads(req.files);
      return res.status(403).json({ message: 'Réservé aux comptes candidats (étudiants).' });
    }
    const files = req.files;
    if (!files?.justificatif_diplome?.[0] || !files?.justificatif_releve?.[0] || !files?.justificatif_formation?.[0]) {
      cleanupProformaUploads(req.files);
      return res.status(400).json({
        message:
          'Les trois justificatifs sont obligatoires : dernier diplôme, relevé de notes, document attestant la formation demandée (PDF, JPG ou PNG).',
      });
    }

    const user = db.get('utilisateurs').find({ id: req.user.id }).value();
    if (!user) {
      cleanupProformaUploads(req.files);
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const telephone = String(req.body.telephone || user.telephone || '').trim();
    if (!telephone || telephone.length < 8) {
      cleanupProformaUploads(req.files);
      return res.status(400).json({ message: 'Numéro de téléphone valide obligatoire (au moins 8 caractères).' });
    }

    const {
      type_formation, formation_id, etablissement_id, niveau, details,
      type_payeur,
      payeur_nom, payeur_prenom, payeur_relation, payeur_telephone,
      payeur_org_nom, payeur_org_ninea, payeur_org_contact,
    } = req.body;

    if (!type_formation || !formation_id) {
      cleanupProformaUploads(req.files);
      return res.status(400).json({ message: 'Formation et mode obligatoires.' });
    }
    if (etablissement_id == null || String(etablissement_id).trim() === '') {
      cleanupProformaUploads(req.files);
      return res.status(400).json({ message: 'Veuillez sélectionner un établissement.' });
    }

    const fid = parseInt(formation_id, 10);
    const formation = db.get('formations').find({ id: fid }).value();
    if (!formation) {
      cleanupProformaUploads(req.files);
      return res.status(404).json({ message: 'Formation introuvable ou identifiant invalide.' });
    }
    if (formation.actif === false) {
      cleanupProformaUploads(req.files);
      return res.status(404).json({
        message: 'Cette formation n’est plus proposée (désactivée).',
      });
    }
    if (formation.type !== type_formation) {
      cleanupProformaUploads(req.files);
      return res.status(400).json({ message: 'La formation choisie ne correspond pas au type sélectionné.' });
    }

    const etabIdBody = parseInt(String(etablissement_id), 10);
    if (!Number.isFinite(etabIdBody) || etabIdBody !== Number(formation.etablissement_id)) {
      cleanupProformaUploads(req.files);
      return res.status(400).json({
        message: 'La formation ne correspond pas à l’établissement choisi.',
      });
    }

    const etabId = etabIdBody;
    if (user.etablissement_id != null && Number(user.etablissement_id) !== etabId) {
      cleanupProformaUploads(req.files);
      return res.status(403).json({
        message:
          'Votre compte est rattaché à un établissement : la demande doit porter sur cet établissement et ses formations.',
      });
    }
    const etab = db.get('etablissements').find({ id: etabId }).value();
    const etablissement_snapshot = etab
      ? {
          nom: etab.nom,
          type: etab.type,
          adresse: etab.adresse || '',
          telephone: etab.telephone || '',
          email_contact: etab.email_contact || '',
          site_web: etab.site_web || '',
          logo_url: publicAssetUrl(req, etab.logo_url),
          cachet_url: publicAssetUrl(req, etab.cachet_url),
          couleur_primaire: etab.couleur_primaire || '#1e40af',
          couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
          ninea: etab.ninea || '',
          compte_bancaire: etab.compte_bancaire || '',
        }
      : null;

    const id = db.nextId('demandes_proforma');
    const reference = `DEM-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

    let diplomeRel;
    let releveRel;
    let formationRel;
    try {
      diplomeRel = persistProformaJustificatif(files.justificatif_diplome[0], id, 'diplome');
      releveRel = persistProformaJustificatif(files.justificatif_releve[0], id, 'releve');
      formationRel = persistProformaJustificatif(files.justificatif_formation[0], id, 'formation');
    } catch {
      cleanupProformaUploads(req.files);
      return res.status(500).json({ message: 'Erreur lors de l’enregistrement des fichiers.' });
    }

    const demande = {
      id,
      reference,
      etudiant_id: user.id,
      prenom: String(user.prenom || '').trim(),
      nom: String(user.nom || '').trim(),
      email: String(user.email || '').trim().toLowerCase(),
      telephone,
      niveau: niveau ? String(niveau).trim() : null,
      type_formation,
      formation_id: parseInt(formation_id, 10),
      etablissement_id: etabId,
      formation_titre: formation.titre,
      formation_description: formation.description || null,
      formation_ville: formation.ville || null,
      formation_niveau_requis: formation.niveau_requis || null,
      formation_mensualite: formation.mensualite || null,
      formation_duree_mois: getDureeMoisEffectif(formation),
      details: details ? String(details).trim() : null,
      type_payeur: type_payeur || 'etudiant',
      payeur:
        type_payeur === 'tuteur'
          ? {
              prenom: (payeur_prenom || '').trim(),
              nom: (payeur_nom || '').trim(),
              relation: (payeur_relation || '').trim(),
              telephone: (payeur_telephone || '').trim(),
            }
          : type_payeur === 'organisation'
            ? {
                org_nom: (payeur_org_nom || '').trim(),
                ninea: (payeur_org_ninea || '').trim(),
                contact: (payeur_org_contact || '').trim(),
              }
            : null,
      etablissement_snapshot,
      justificatifs: {
        diplome: diplomeRel,
        releve: releveRel,
        formation: formationRel,
      },
      statut: 'en_attente',
      facture: null,
      created_at: new Date().toISOString(),
    };

    db.get('demandes_proforma').push(demande).write();

    res.status(201).json({
      message:
        'Demande enregistrée. Elle sera examinée par le service pédagogique ; vous pourrez télécharger la facture proforma et l’attestation de préinscription après validation.',
      reference,
      id,
    });
  },
);

// GET /api/etudiant/demandes-proforma — demandes liées au compte (email ou etudiant_id)
router.get('/demandes-proforma', authMiddleware, (req, res) => {
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const email = (user.email || '').toLowerCase();
  const uid = Number(user.id);
  const list = db
    .get('demandes_proforma')
    .value()
    .filter(
      (d) =>
        (d.email || '').toLowerCase() === email ||
        (d.etudiant_id != null && Number(d.etudiant_id) === uid),
    );
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
    snapshotFromFormation(formation) || snapshotFromEtablissementId(dossier.etablissement_id || u.etablissement_id);

  const y = new Date().getFullYear();
  const lettre_extensions = {
    reference_lettre: `LPI-${y}-${String(dossier.id).padStart(5, '0')}`,
    numero_dossier: dossier.numero_dossier,
    date_soumission: dossier.created_at,
    matricule_candidat: identite.matricule || null,
    numero_passeport: identite.numero_passeport || null,
    nationalite: identite.nationalite || null,
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

// GET /api/etudiant/attestation-demande/:demandeId — attestation (demande proforma acceptée)
router.get('/attestation-demande/:demandeId', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.demandeId), 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Identifiant invalide' });
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable' });
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  const sameEmail = user && (user.email || '').toLowerCase() === (demande.email || '').toLowerCase();
  const sameId =
    demande.etudiant_id != null && user && Number(demande.etudiant_id) === Number(user.id);
  if (!sameEmail && !sameId) return res.status(403).json({ message: 'Accès refusé' });
  const built = buildAttestationPayloadForDemandeProforma(id);
  if (built.error) return res.status(built.error.status).json({ message: built.error.message });
  res.json(built.body);
});

// GET /api/etudiant/lettre-demande/:demandeId — déprécié : pas de lettre pour le flux demande proforma (facture + attestation uniquement)
router.get('/lettre-demande/:demandeId', authMiddleware, (req, res) => {
  res.status(403).json({
    message:
      'Pour une demande de facture proforma, seuls la facture proforma et l’attestation de préinscription sont disponibles (pas de lettre de préinscription).',
  });
});

module.exports = router;
