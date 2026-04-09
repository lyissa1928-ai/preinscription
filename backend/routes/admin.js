const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const {
  normalizeMatricule, isValidMatriculeFormat, matriculeTaken,
  normalizeTelephoneForUniqueness, telephoneTaken,
} = require('../utils/userIdentity');
const { generateNextMatriculeForEtablissement, generateNextMatriculeDirecteur } = require('../utils/matriculeGenerator');
const { createBackup, DB_PATH, BACKUP_DIR } = require('../utils/dbBackup');
const { logAudit } = require('../utils/auditLog');
const { DOSSIER_STATUSES, canTransitionDossierStatus, requiresRejectionComment } = require('../utils/dossierWorkflow');
const { createUserNotification } = require('../utils/notificationService');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { retentionConfigFromEnv, runMaintenancePrune } = require('../utils/maintenance');
const { getRuntimeMetricsSnapshot } = require('../utils/runtimeMetrics');
const { proformaDemandeDecision } = require('../services/proformaDemandeDecisionService');

router.use(authMiddleware, adminOnly);
const adminSensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Trop d’actions sensibles en peu de temps. Réessayez dans 1 minute.',
  keyGenerator: (req) => `admin-sensitive:${getClientIp(req)}:${req.method}:${req.path}`,
});

// GET /api/admin/backup/export — crée un snapshot et le télécharge
router.get('/backup/export', (req, res) => {
  try {
    const backupPath = createBackup('admin-export');
    return res.download(backupPath);
  } catch (e) {
    return res.status(500).json({ message: `Backup impossible: ${e.message}` });
  }
});

// GET /api/admin/backup/db — télécharge le fichier base actuel
router.get('/backup/db', (req, res) => {
  return res.download(DB_PATH);
});

// GET /api/admin/backup/list — historique des backups
router.get('/backup/list', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const list = fs.readdirSync(BACKUP_DIR)
      .filter((n) => n.startsWith('preinscription-') && n.endsWith('.json'))
      .map((n) => {
        const full = path.join(BACKUP_DIR, n);
        const st = fs.statSync(full);
        return { name: n, size: st.size, updated_at: st.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: `Lecture backups impossible: ${e.message}` });
  }
});

// GET /api/admin/maintenance/retention — configuration effective de rétention
router.get('/maintenance/retention', (req, res) => {
  return res.json(retentionConfigFromEnv());
});

// GET /api/admin/runtime-metrics — monitoring runtime léger
router.get('/runtime-metrics', (req, res) => {
  return res.json(getRuntimeMetricsSnapshot());
});

// POST /api/admin/maintenance/prune — purge manuelle (logs, notifications, backups)
router.post('/maintenance/prune', adminSensitiveLimiter, (req, res) => {
  const cfg = retentionConfigFromEnv();
  const override = {};
  const body = req.body || {};
  const dryRun = body.dry_run === true || ['1', 'true', 'yes', 'oui'].includes(String(body.dry_run || '').toLowerCase());
  const preBackup = body.pre_backup === undefined
    ? true
    : (body.pre_backup === true || ['1', 'true', 'yes', 'oui'].includes(String(body.pre_backup || '').toLowerCase()));
  const keys = ['audit_logs_days', 'security_events_days', 'notifications_days', 'read_notifications_days', 'backup_max_files'];
  for (const k of keys) {
    if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== '') {
      const n = parseInt(body[k], 10);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ message: `Paramètre invalide: ${k}` });
      }
      override[k] = n;
    }
  }
  const finalCfg = { ...cfg, ...override };
  let preBackupPath = null;
  if (!dryRun && preBackup) {
    preBackupPath = createBackup('maintenance-pre-prune');
  }
  const result = runMaintenancePrune(finalCfg, { dryRun });
  logAudit(req, 'maintenance_prune', 'system', null, {
    dry_run: dryRun,
    pre_backup: !!preBackupPath,
    pre_backup_path: preBackupPath,
    total_removed: result.total_removed,
    config: finalCfg,
  });
  return res.json({
    message: dryRun
      ? `Simulation terminée. ${result.total_removed} élément(s) seraient supprimé(s).`
      : `Maintenance terminée. ${result.total_removed} élément(s) supprimé(s).`,
    pre_backup: preBackupPath,
    report: {
      type: dryRun ? 'dry-run' : 'execution',
      generated_at: result.generated_at,
      total_removed: result.total_removed,
    },
    result,
  });
});

// GET /api/admin/dossiers
router.get('/dossiers', (req, res) => {
  const { statut, search, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  let dossiers = db.get('dossiers').value();

  // Joindre avec les utilisateurs
  const utilisateurs = db.get('utilisateurs').value();
  dossiers = dossiers.map(d => {
    const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
    return {
      ...d,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      matricule: u.matricule || null,
    };
  });

  if (statut) dossiers = dossiers.filter(d => d.statut === statut);
  if (search) {
    const s = search.toLowerCase();
    dossiers = dossiers.filter(d =>
      (d.nom || '').toLowerCase().includes(s) ||
      (d.prenom || '').toLowerCase().includes(s) ||
      (d.email || '').toLowerCase().includes(s) ||
      (d.numero_dossier || '').toLowerCase().includes(s) ||
      String(d.matricule || '').toLowerCase().includes(s)
    );
  }

  // Trier par date décroissante
  dossiers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = dossiers.length;
  const offset = (pageNum - 1) * limitNum;
  const paginated = dossiers.slice(offset, offset + limitNum);

  res.json({ dossiers: paginated, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
});

// GET /api/admin/dossiers/:id
router.get('/dossiers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const documents = db.get('documents').filter({ dossier_id: id }).value();

  res.json({
    dossier: {
      ...dossier,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      matricule: u.matricule || null,
      date_inscription: u.created_at,
    },
    documents
  });
});

// PUT /api/admin/dossiers/:id/statut
router.put('/dossiers/:id/statut', (req, res) => {
  const { statut, commentaire } = req.body;
  if (!statut || !DOSSIER_STATUSES.includes(statut)) return res.status(400).json({ message: 'Statut invalide' });

  const id = parseInt(req.params.id);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!canTransitionDossierStatus(dossier.statut, statut)) {
    return res.status(400).json({ message: `Transition non autorisée: ${dossier.statut} -> ${statut}.` });
  }
  if (requiresRejectionComment(statut) && !String(commentaire || '').trim()) {
    return res.status(400).json({ message: 'Le motif/commentaire est obligatoire pour un refus.' });
  }

  db.get('dossiers').find({ id }).assign({
    statut,
    commentaire_admin: commentaire || null,
    updated_at: new Date().toISOString(),
  }).write();
  if (dossier.etudiant_id) {
    const statusLabel = {
      en_attente: 'en attente',
      en_cours: 'en cours',
      accepte: 'accepté',
      refuse: 'refusé',
    }[statut] || statut;
    createUserNotification(dossier.etudiant_id, {
      type: 'dossier_statut',
      title: 'Mise à jour de votre dossier',
      message: `Le statut de votre dossier ${dossier.numero_dossier} est maintenant: ${statusLabel}.`,
      link: '/dashboard',
      meta: { dossier_id: dossier.id, numero_dossier: dossier.numero_dossier, statut },
    });
  }
  logAudit(req, 'update_status', 'dossier', id, {
    from: dossier.statut,
    to: statut,
    commentaire: commentaire ? String(commentaire).slice(0, 180) : null,
  });
  res.json({ message: 'Statut mis à jour avec succès' });
});

// GET /api/admin/statistiques
router.get('/statistiques', (req, res) => {
  const dossiers = db.get('dossiers').value();
  const utilisateurs = db.get('utilisateurs').value();

  const parFiliere = {};
  dossiers.forEach(d => { parFiliere[d.filiere] = (parFiliere[d.filiere] || 0) + 1; });
  const parFiliereArr = Object.entries(parFiliere).map(([filiere, count]) => ({ filiere, count })).sort((a, b) => b.count - a.count);

  const recents = [...dossiers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map(d => {
      const u = utilisateurs.find(u => u.id === d.etudiant_id) || {};
      return { numero_dossier: d.numero_dossier, statut: d.statut, created_at: d.created_at, nom: u.nom, prenom: u.prenom };
    });

  res.json({
    total: dossiers.length,
    en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
    en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
    acceptes: dossiers.filter(d => d.statut === 'accepte').length,
    refuses: dossiers.filter(d => d.statut === 'refuse').length,
    total_etudiants: utilisateurs.filter(u => u.role === 'etudiant').length,
    par_filiere: parFiliereArr,
    recents
  });
});

// GET /api/admin/demandes-proforma
router.get('/demandes-proforma', (req, res) => {
  const demandes = db.get('demandes_proforma').value()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(demandes);
});

// PUT /api/admin/demandes-proforma/:id/statut — métadonnées internes uniquement (pas acceptee/refusee)
router.put('/demandes-proforma/:id/statut', (req, res) => {
  const id = parseInt(req.params.id);
  const { statut } = req.body;
  const STATUTS_VALIDES = ['nouvelle', 'vue', 'en_cours', 'convertie', 'annulee', 'traitee', 'en_attente'];
  if (!STATUTS_VALIDES.includes(statut)) {
    return res.status(400).json({
      message:
        'Statut invalide. Pour accepter ou refuser une demande, utilisez l’endpoint « décision » (validation pédagogique).',
    });
  }
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable.' });
  db.get('demandes_proforma').find({ id }).assign({ statut, updated_at: new Date().toISOString() }).write();
  res.json({ message: 'Statut mis à jour.' });
});

// PUT /api/admin/demandes-proforma/:id/decision — accepter / refuser (même logique que le staff établissement)
router.put('/demandes-proforma/:id/decision', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable.' });
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

// PUT /api/admin/demandes-proforma/:id/revoke-acceptation — retire la facture et remet la demande en attente
router.put('/demandes-proforma/:id/revoke-acceptation', adminSensitiveLimiter, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }
  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return res.status(404).json({ message: 'Demande introuvable.' });
  const hasFacture = !!(demande.facture && demande.facture.numero);
  if (!hasFacture) {
    return res.status(400).json({ message: 'Aucune facture à retirer sur cette demande.' });
  }
  if (demande.statut === 'refusee') {
    return res.status(400).json({ message: 'Impossible de modifier une demande refusée.' });
  }

  db.get('demandes_proforma')
    .find({ id })
    .assign({
      statut: 'en_attente',
      facture: null,
      lettre_preinscription: null,
      acceptee_le: null,
      acceptee_par: null,
      updated_at: new Date().toISOString(),
    })
    .write();

  logAudit(req, 'proforma_revoke_acceptation', 'demande_proforma', id, {
    reference: demande.reference,
    ancien_statut: demande.statut,
  });

  if (demande.etudiant_id) {
    createUserNotification(demande.etudiant_id, {
      type: 'demande_proforma',
      title: 'Demande de facture proforma',
      message: `Votre demande ${demande.reference || ''} a été remise en attente. La facture proforma n'est plus disponible tant qu'elle n'est pas à nouveau validée.`,
      link: '/dashboard',
      meta: { demande_id: id, reference: demande.reference, statut: 'en_attente' },
    });
  }

  const updated = db.get('demandes_proforma').find({ id }).value();
  res.json({
    message: 'La facture a été retirée. La demande est à nouveau en attente de validation.',
    demande: updated,
  });
});

// POST /api/admin/demandes-proforma/delete-batch — body { ids: number[] } — max 10, suppression définitive
router.post('/demandes-proforma/delete-batch', adminSensitiveLimiter, (req, res) => {
  const rawIds = Array.isArray(req.body.ids) ? req.body.ids : [];
  const ids = [...new Set(rawIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Liste d’identifiants vide.' });
  }
  if (ids.length > 10) {
    return res.status(400).json({
      message: 'Suppression groupée limitée à 10 demandes par envoi. Cochez au plus 10 lignes sur la page courante ou relancez « Tout supprimer ».',
    });
  }
  const removed = [];
  const skipped = [];
  ids.forEach((id) => {
    const d = db.get('demandes_proforma').find({ id }).value();
    if (!d) {
      skipped.push(id);
      return;
    }
    db.get('demandes_proforma').remove({ id }).write();
    removed.push(id);
    logAudit(req, 'demande_proforma_hard_delete', 'demande_proforma', id, {
      reference: d.reference,
    });
  });
  return res.json({
    message: `${removed.length} demande(s) définitivement supprimée(s) de la base.`,
    removed,
    skipped,
  });
});

// GET /api/admin/utilisateurs?role=etudiant|staff|all
router.get('/utilisateurs', (req, res) => {
  const { role = 'all', page, limit, search = '', etablissement_id = '' } = req.query;
  const dossiers = db.get('dossiers').value();
  const STAFF_ROLES = ['admin', 'responsable', 'agent_admin', 'comptable', 'directeur', 'controleur_qualite'];

  let utilisateurs = db.get('utilisateurs').value();
  if (role === 'etudiant') {
    utilisateurs = utilisateurs.filter(u => u.role === 'etudiant');
  } else if (role === 'staff') {
    utilisateurs = utilisateurs.filter(u => STAFF_ROLES.includes(u.role));
  }
  if (etablissement_id && etablissement_id !== 'all') {
    utilisateurs = utilisateurs.filter((u) => String(u.etablissement_id || '') === String(etablissement_id));
  }

  const etablissements = db.get('etablissements').value();
  let result = utilisateurs
    .map(u => {
      const { mot_de_passe, ...safe } = u;
      const dossier = dossiers.find(d => d.etudiant_id === u.id);
      const etab = u.etablissement_id ? etablissements.find(e => e.id === u.etablissement_id) : null;
      return { ...safe, statut_dossier: dossier ? dossier.statut : null, etablissement_nom: etab ? etab.nom : null };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));;

  if (search) {
    const s = String(search).trim().toLowerCase();
    result = result.filter((u) => {
      const hay = `${u.prenom || ''} ${u.nom || ''} ${u.email || ''} ${u.matricule || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }

  const hasPagination = page !== undefined || limit !== undefined || search !== '' || etablissement_id !== '';
  if (!hasPagination) {
    return res.json(result);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const total = result.length;
  const offset = (pageNum - 1) * limitNum;
  const items = result.slice(offset, offset + limitNum);

  return res.json({
    items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

// POST /api/admin/utilisateurs/bulk-action — Actions par lot
// DOIT être défini AVANT /:id pour éviter le conflit de route
router.post('/utilisateurs/bulk-action', adminSensitiveLimiter, (req, res) => {
  const { ids, action, confirmation_bulk } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Aucun utilisateur sélectionné.' });
  }
  if (!['desactiver', 'reactiver', 'supprimer'].includes(action)) {
    return res.status(400).json({ message: 'Action invalide.' });
  }

  const utilisateurs = db.get('utilisateurs').value();
  const targets = ids.map(id => utilisateurs.find(u => u.id === parseInt(id))).filter(Boolean);
  const admins = targets.filter(u => u.role === 'admin');
  if (admins.length > 0) {
    return res.status(403).json({ message: 'Impossible d\'agir sur un compte administrateur.' });
  }

  if (action === 'supprimer') {
    const expected = `SUPPRIMER ${ids.length} COMPTE${ids.length > 1 ? 'S' : ''}`;
    if (String(confirmation_bulk || '').trim().toUpperCase() !== expected) {
      return res.status(400).json({
        message: `Pour confirmer, saisissez exactement : ${expected}`,
      });
    }
    ids.forEach(id => db.get('utilisateurs').remove({ id: parseInt(id) }).write());
    return res.json({ message: `${ids.length} compte(s) supprimé(s) définitivement.` });
  }

  const update = action === 'desactiver'
    ? { actif: false, deleted_at: new Date().toISOString() }
    : { actif: true, deleted_at: undefined };

  ids.forEach(id => db.get('utilisateurs').find({ id: parseInt(id) }).assign(update).write());
  res.json({ message: `${ids.length} compte(s) ${action === 'desactiver' ? 'désactivé(s)' : 'réactivé(s)'}.` });
});

// POST /api/admin/utilisateurs/:id/reinitialiser-mot-de-passe — mot de passe temporaire + changement obligatoire
router.post('/utilisateurs/:id/reinitialiser-mot-de-passe', adminSensitiveLimiter, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const target = db.get('utilisateurs').find({ id }).value();
  if (!target) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (target.role === 'admin') {
    return res.status(403).json({
      message: 'Impossible de réinitialiser le mot de passe d’un compte administrateur.',
    });
  }

  const plain = generateTempPassword(14);
  const hash = bcrypt.hashSync(plain, 10);
  db.get('utilisateurs').find({ id }).assign({
    mot_de_passe: hash,
    must_change_password: true,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    password_reset_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: req.user.id,
  }).write();

  logAudit(req, 'admin_password_reset', 'utilisateur', id, {
    target_role: target.role,
    target_email: target.email,
  });
  logSecurityEvent(req, 'admin_password_reset', { target_user_id: id, target_role: target.role }, 'warning');

  res.json({
    message:
      'Mot de passe réinitialisé. L’utilisateur devra le changer à la prochaine connexion. Transmettez le mot de passe temporaire par un canal externe sécurisé (téléphone, messagerie, etc.).',
    mot_de_passe_temporaire: plain,
  });
});

// POST /api/admin/utilisateurs — Créer un compte staff
router.post('/utilisateurs', adminSensitiveLimiter, (req, res) => {
  const {
    prenom, nom, email, mot_de_passe, mot_de_passe_confirmation,
    role, etablissement_id, date_naissance, telephone, adresse,
  } = req.body;
  const ROLES_STAFF = ['responsable', 'agent_admin', 'comptable', 'directeur', 'controleur_qualite'];

  if (!prenom || !nom || !email || !mot_de_passe || !role || !telephone) {
    return res.status(400).json({
      message: 'Champs obligatoires : prénom, nom, email, téléphone, mot de passe, rôle.',
    });
  }
  if (mot_de_passe !== mot_de_passe_confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  if (!ROLES_STAFF.includes(role)) {
    return res.status(400).json({ message: 'Rôle invalide.' });
  }

  const isDirecteurGlobal = role === 'directeur';
  let etabIdForUser = null;
  let etab = null;
  if (!isDirecteurGlobal) {
    if (!etablissement_id) {
      return res.status(400).json({ message: 'L\'établissement est obligatoire pour ce rôle staff.' });
    }
    etabIdForUser = parseInt(etablissement_id, 10);
    etab = db.get('etablissements').find({ id: etabIdForUser }).value();
    if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailNorm = String(email).trim().toLowerCase();
  if (!emailRegex.test(emailNorm)) {
    return res.status(400).json({ message: 'Email invalide.' });
  }
  if (mot_de_passe.length < 6) {
    return res.status(400).json({ message: 'Mot de passe trop court (min 6 caractères).' });
  }
  const gen = isDirecteurGlobal
    ? generateNextMatriculeDirecteur()
    : generateNextMatriculeForEtablissement(etabIdForUser);
  if (gen.error) return res.status(400).json({ message: gen.error });
  const matNorm = normalizeMatricule(gen.matricule);

  const exist = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (exist) return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });

  const telTrim = String(telephone).trim();
  const telNorm = normalizeTelephoneForUniqueness(telTrim);
  if (telNorm.length < 8) {
    return res.status(400).json({
      message: 'Numéro de téléphone invalide ou trop court (minimum 8 chiffres).',
    });
  }
  if (telephoneTaken(telNorm, null)) {
    return res.status(409).json({ message: 'Ce numéro de téléphone est déjà associé à un autre compte.' });
  }

  const hash = bcrypt.hashSync(mot_de_passe, 10);
  const id = db.nextId('utilisateurs');
  const user = {
    id,
    prenom: prenom.trim(),
    nom: nom.trim(),
    email: emailNorm,
    matricule: matNorm,
    date_naissance: date_naissance ? String(date_naissance).trim() : null,
    telephone: telTrim,
    adresse: adresse ? String(adresse).trim() : '',
    mot_de_passe: hash,
    role,
    etablissement_id: isDirecteurGlobal ? null : etabIdForUser,
    actif: true,
    must_change_password: true,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString(),
    created_by: req.user.id,
  };
  db.get('utilisateurs').push(user).write();

  const { mot_de_passe: _, ...safe } = user;
  res.status(201).json({
    message: `Compte ${role} créé. L'utilisateur devra changer son mot de passe à la première connexion.`,
    utilisateur: safe,
  });
});

// PUT /api/admin/utilisateurs/:id — Modifier un compte staff
router.put('/utilisateurs/:id', adminSensitiveLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  if (user.role === 'admin' && id === 1) {
    return res.status(403).json({ message: 'Impossible de modifier le compte administrateur principal.' });
  }

  const {
    nom, prenom, email, role, actif, etablissement_id, mot_de_passe,
    matricule, date_naissance, telephone, adresse,
  } = req.body;
  const ROLES_VALIDES = ['responsable', 'agent_admin', 'comptable', 'directeur', 'controleur_qualite', 'etudiant'];
  const update = { updated_at: new Date().toISOString(), updated_by: req.user.id };
  let matriculeRegenerated = false;

  if (date_naissance !== undefined) update.date_naissance = date_naissance ? String(date_naissance).trim() : null;
  if (telephone !== undefined) {
    const telTrim = telephone != null ? String(telephone).trim() : '';
    const telNorm = normalizeTelephoneForUniqueness(telTrim);
    if (telNorm && telNorm.length < 8) {
      return res.status(400).json({ message: 'Numéro de téléphone invalide ou trop court (minimum 8 chiffres).' });
    }
    if (telNorm && telephoneTaken(telNorm, id)) {
      return res.status(409).json({ message: 'Ce numéro de téléphone est déjà associé à un autre compte.' });
    }
    update.telephone = telTrim;
  }
  if (adresse !== undefined) update.adresse = adresse != null ? String(adresse).trim() : '';

  if (nom !== undefined) update.nom = nom.trim();
  if (prenom !== undefined) update.prenom = prenom.trim();
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Email invalide.' });
    const exist = db.get('utilisateurs').find({ email: email.trim().toLowerCase() }).value();
    if (exist && exist.id !== id) return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    update.email = email.trim().toLowerCase();
  }
  if (role !== undefined) {
    if (!ROLES_VALIDES.includes(role)) return res.status(400).json({ message: 'Rôle invalide.' });
    update.role = role;
    if (role === 'directeur') {
      update.etablissement_id = null;
      const needDirMat =
        user.role !== 'directeur' || user.etablissement_id != null;
      if (needDirMat) {
        const gen = generateNextMatriculeDirecteur();
        if (gen.error) return res.status(400).json({ message: gen.error });
        update.matricule = normalizeMatricule(gen.matricule);
        matriculeRegenerated = true;
      }
    }
    if (
      role !== undefined &&
      role !== 'directeur' &&
      ['responsable', 'agent_admin', 'comptable'].includes(role) &&
      user.role === 'directeur' &&
      etablissement_id === undefined
    ) {
      return res.status(400).json({
        message: 'Pour quitter le rôle directeur, indiquez l’établissement de rattachement.',
      });
    }
  }
  if (actif !== undefined) update.actif = !!actif;
  const effectiveRoleAfter = update.role !== undefined ? update.role : user.role;
  if (etablissement_id !== undefined && effectiveRoleAfter !== 'directeur') {
    if (etablissement_id) {
      const newEid = parseInt(etablissement_id, 10);
      const etab = db.get('etablissements').find({ id: newEid }).value();
      if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
      update.etablissement_id = newEid;
      if (newEid !== user.etablissement_id) {
        const gen = generateNextMatriculeForEtablissement(newEid);
        if (gen.error) return res.status(400).json({ message: gen.error });
        update.matricule = normalizeMatricule(gen.matricule);
        matriculeRegenerated = true;
      }
    } else {
      if (['responsable', 'agent_admin', 'comptable'].includes(effectiveRoleAfter)) {
        return res.status(400).json({
          message: 'L\'établissement est obligatoire pour ce rôle.',
        });
      }
      update.etablissement_id = null;
    }
  }
  if (etablissement_id !== undefined && effectiveRoleAfter === 'directeur' && etablissement_id) {
    return res.status(400).json({
      message: 'Un directeur de supervision globale n\'est pas rattaché à un établissement.',
    });
  }
  if (matricule !== undefined && !matriculeRegenerated) {
    if (!isValidMatriculeFormat(matricule)) {
      return res.status(400).json({ message: 'Matricule invalide.' });
    }
    const matNorm = normalizeMatricule(matricule);
    if (matriculeTaken(matNorm, id)) {
      return res.status(409).json({ message: 'Ce matricule est déjà utilisé.' });
    }
    update.matricule = matNorm;
  }
  if (mot_de_passe) {
    if (mot_de_passe.length < 6) return res.status(400).json({ message: 'Mot de passe trop court (min 6 caractères).' });
    const bcrypt = require('bcryptjs');
    update.mot_de_passe = bcrypt.hashSync(mot_de_passe, 10);
  }

  db.get('utilisateurs').find({ id }).assign(update).write();
  res.json({ message: 'Utilisateur mis à jour.' });
});

// DELETE /api/admin/utilisateurs/:id — Désactiver (soft delete)
router.delete('/utilisateurs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de désactiver un administrateur.' });

  db.get('utilisateurs').find({ id }).assign({ actif: false, deleted_at: new Date().toISOString() }).write();
  res.json({ message: 'Compte désactivé.' });
});

// DELETE /api/admin/utilisateurs/:id/supprimer — Suppression définitive (matricule ou email si pas de matricule)
router.delete('/utilisateurs/:id/supprimer', adminSensitiveLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un administrateur.' });

  const confirmation_matricule = req.body?.confirmation_matricule ?? req.query?.confirmation_matricule;
  const confirmation_email = req.body?.confirmation_email ?? req.query?.confirmation_email;

  const matExpected = normalizeMatricule(user.matricule || '');
  if (matExpected) {
    if (normalizeMatricule(confirmation_matricule) !== matExpected) {
      return res.status(400).json({
        message: 'Matricule de confirmation incorrect. Saisissez le matricule exact du compte à supprimer.',
      });
    }
  } else {
    const emailExpected = String(user.email || '').trim().toLowerCase();
    if (!emailExpected) {
      return res.status(400).json({
        message: 'Ce compte n’a ni matricule ni email : assignez un matricule (édition) ou contactez un administrateur technique.',
      });
    }
    const provided = String(confirmation_email || '').trim().toLowerCase();
    if (provided !== emailExpected) {
      return res.status(400).json({
        message: 'Email de confirmation incorrect. Saisissez l’adresse email exacte du compte à supprimer.',
      });
    }
  }

  db.get('utilisateurs').remove({ id }).write();
  res.json({ message: 'Compte supprimé définitivement.' });
});

// GET /api/admin/statistiques-globales
router.get('/statistiques-globales', (req, res) => {
  const dossiers = db.get('dossiers').value();
  const utilisateurs = db.get('utilisateurs').value();
  const demandes = db.get('demandes_proforma').value();
  const STAFF_ROLES = ['admin', 'responsable', 'agent_admin', 'comptable', 'directeur', 'controleur_qualite'];

  const parRole = {};
  STAFF_ROLES.forEach(r => { parRole[r] = utilisateurs.filter(u => u.role === r).length; });

  res.json({
    dossiers: {
      total: dossiers.length,
      en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
      en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
      acceptes: dossiers.filter(d => d.statut === 'accepte').length,
      refuses: dossiers.filter(d => d.statut === 'refuse').length
    },
    utilisateurs: {
      total: utilisateurs.length,
      etudiants: utilisateurs.filter(u => u.role === 'etudiant').length,
      staff: utilisateurs.filter(u => STAFF_ROLES.includes(u.role)).length,
      par_role: parRole
    },
    demandes_proforma: demandes.length
  });
});

// GET /api/admin/audit-logs?entity=formation&action=create&user_id=12&page=1&limit=50
router.get('/audit-logs', (req, res) => {
  const { entity = '', action = '', user_id = '', q = '', page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const userId = user_id ? parseInt(user_id, 10) : null;

  let logs = db.get('audit_logs').value() || [];
  if (entity) logs = logs.filter((x) => String(x.entity || '') === String(entity));
  if (action) logs = logs.filter((x) => String(x.action || '') === String(action));
  if (userId && !Number.isNaN(userId)) logs = logs.filter((x) => Number(x.user_id) === userId);
  if (q) {
    const s = String(q).trim().toLowerCase();
    logs = logs.filter((x) => {
      const txt = [
        x.action, x.entity, x.path, x.user_role, x.entity_id, x.user_id,
        x.details ? JSON.stringify(x.details) : '',
      ].map((v) => String(v || '')).join(' ').toLowerCase();
      return txt.includes(s);
    });
  }

  logs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const total = logs.length;
  const offset = (pageNum - 1) * limitNum;
  const items = logs.slice(offset, offset + limitNum);

  return res.json({
    items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

// GET /api/admin/security-events?type=rate_limit_block&severity=warning&page=1&limit=50
router.get('/security-events', (req, res) => {
  const { type = '', severity = '', q = '', page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  let items = db.get('security_events').value() || [];
  if (type) items = items.filter((x) => String(x.type || '') === String(type));
  if (severity) items = items.filter((x) => String(x.severity || '') === String(severity));
  if (q) {
    const s = String(q).trim().toLowerCase();
    items = items.filter((x) => {
      const txt = [
        x.type, x.severity, x.path, x.ip, x.user_role, x.user_id,
        x.details ? JSON.stringify(x.details) : '',
      ].map((v) => String(v || '')).join(' ').toLowerCase();
      return txt.includes(s);
    });
  }

  items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const total = items.length;
  const offset = (pageNum - 1) * limitNum;
  const pageItems = items.slice(offset, offset + limitNum);
  return res.json({
    items: pageItems,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

module.exports = router;
