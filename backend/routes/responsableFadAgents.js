/**
 * Gestion des Agents FAD par le Responsable FAD (même établissement uniquement).
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextMatriculeForEtablissement } = require('../utils/matriculeGenerator');
const {
  normalizeMatricule,
  normalizeTelephoneForUniqueness,
  telephoneTaken,
} = require('../utils/userIdentity');
const { logAudit } = require('../utils/auditLog');

const fadResponsableOnly = (req, res, next) => {
  if (req.user?.role === 'responsable_fad' || req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Réservé au Responsable FAD (ou administrateur).' });
};

router.use(authMiddleware, fadResponsableOnly);

function etabIdOf(req) {
  if (req.user.role === 'admin' && req.query.etablissement_id) {
    return parseInt(req.query.etablissement_id, 10);
  }
  if (req.user.role === 'admin' && req.body?.etablissement_id) {
    return parseInt(req.body.etablissement_id, 10);
  }
  return Number(req.user.etablissement_id);
}

function assertSameEtab(req, user) {
  if (req.user.role === 'admin') return true;
  return user && Number(user.etablissement_id) === Number(req.user.etablissement_id);
}

function publicAgent(u) {
  return {
    id: u.id,
    prenom: u.prenom,
    nom: u.nom,
    email: u.email,
    telephone: u.telephone || '',
    adresse: u.adresse || '',
    matricule: u.matricule || null,
    role: u.role,
    actif: u.actif !== false,
    created_at: u.created_at,
  };
}

router.get('/agents', (req, res) => {
  const etabId = etabIdOf(req);
  if (!etabId || Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Établissement de rattachement manquant.' });
  }
  const agents = (db.get('utilisateurs').value() || [])
    .filter(
      (u) =>
        u.role === 'agent_fad'
        && Number(u.etablissement_id) === etabId
        && !u.deleted_at,
    )
    .map(publicAgent);
  res.json(agents);
});

router.post('/agents', (req, res) => {
  const etabId = etabIdOf(req);
  if (!etabId || Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Établissement de rattachement manquant.' });
  }
  if (req.user.role === 'responsable_fad' && Number(req.user.etablissement_id) !== etabId) {
    return res.status(403).json({ message: 'Vous ne pouvez gérer que les agents de votre établissement.' });
  }

  const {
    prenom, nom, email, mot_de_passe, mot_de_passe_confirmation, telephone, adresse, date_naissance,
  } = req.body || {};
  if (!prenom || !nom || !email || !mot_de_passe || !telephone) {
    return res.status(400).json({
      message: 'Champs obligatoires : prénom, nom, email, téléphone, mot de passe.',
    });
  }
  if (mot_de_passe_confirmation != null && mot_de_passe !== mot_de_passe_confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  if (db.get('utilisateurs').find({ email: emailNorm }).value()) {
    return res.status(400).json({ message: 'Email déjà utilisé.' });
  }

  const telTrim = String(telephone).trim();
  const telNorm = normalizeTelephoneForUniqueness(telTrim);
  if (telNorm.length < 8) {
    return res.status(400).json({ message: 'Numéro de téléphone trop court (minimum 8 chiffres).' });
  }
  if (telephoneTaken(telNorm, null)) {
    return res.status(409).json({ message: 'Ce numéro de téléphone est déjà associé à un autre compte.' });
  }

  const gen = generateNextMatriculeForEtablissement(etabId);
  if (gen.error) return res.status(400).json({ message: gen.error });
  const matNorm = normalizeMatricule(gen.matricule);

  const id = db.nextId('utilisateurs');
  const user = {
    id,
    prenom: String(prenom).trim(),
    nom: String(nom).trim(),
    email: emailNorm,
    matricule: matNorm,
    date_naissance: date_naissance ? String(date_naissance).trim() : null,
    telephone: telTrim,
    adresse: adresse ? String(adresse).trim() : '',
    mot_de_passe: bcrypt.hashSync(mot_de_passe, 10),
    role: 'agent_fad',
    etablissement_id: etabId,
    actif: true,
    must_change_password: true,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString(),
  };
  db.get('utilisateurs').push(user).write();
  logAudit(req, 'agent_fad_cree', 'utilisateur', id, {
    etablissement_id: etabId,
    email: user.email,
  });
  res.status(201).json({ ...publicAgent(user), must_change_password: true });
});

router.put('/agents/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const target = db.get('utilisateurs').find({ id }).value();
  if (!target || target.role !== 'agent_fad' || target.deleted_at) {
    return res.status(404).json({ message: 'Agent FAD introuvable.' });
  }
  if (!assertSameEtab(req, target)) {
    return res.status(403).json({ message: 'Hors de votre établissement.' });
  }

  const { prenom, nom, email, telephone, adresse, date_naissance, mot_de_passe } = req.body || {};
  const patch = {};
  if (prenom != null) patch.prenom = String(prenom).trim();
  if (nom != null) patch.nom = String(nom).trim();
  if (adresse != null) patch.adresse = String(adresse).trim();
  if (date_naissance != null) patch.date_naissance = String(date_naissance).trim() || null;
  if (email != null) {
    const emailNorm = String(email).trim().toLowerCase();
    const clash = db.get('utilisateurs').find({ email: emailNorm }).value();
    if (clash && Number(clash.id) !== id) {
      return res.status(400).json({ message: 'Email déjà utilisé.' });
    }
    patch.email = emailNorm;
  }
  if (telephone != null) {
    const telTrim = String(telephone).trim();
    const telNorm = normalizeTelephoneForUniqueness(telTrim);
    if (telNorm.length < 8) {
      return res.status(400).json({ message: 'Numéro de téléphone trop court.' });
    }
    if (telephoneTaken(telNorm, id)) {
      return res.status(409).json({ message: 'Téléphone déjà utilisé.' });
    }
    patch.telephone = telTrim;
  }
  if (mot_de_passe) {
    patch.mot_de_passe = bcrypt.hashSync(mot_de_passe, 10);
    patch.must_change_password = true;
  }
  db.get('utilisateurs').find({ id }).assign(patch).write();
  res.json(publicAgent(db.get('utilisateurs').find({ id }).value()));
});

router.patch('/agents/:id/actif', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const target = db.get('utilisateurs').find({ id }).value();
  if (!target || target.role !== 'agent_fad' || target.deleted_at) {
    return res.status(404).json({ message: 'Agent FAD introuvable.' });
  }
  if (!assertSameEtab(req, target)) {
    return res.status(403).json({ message: 'Hors de votre établissement.' });
  }
  const actif = req.body?.actif !== false && req.body?.actif !== 0;
  db.get('utilisateurs').find({ id }).assign({ actif }).write();
  res.json(publicAgent(db.get('utilisateurs').find({ id }).value()));
});

router.delete('/agents/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const target = db.get('utilisateurs').find({ id }).value();
  if (!target || target.role !== 'agent_fad') {
    return res.status(404).json({ message: 'Agent FAD introuvable.' });
  }
  if (!assertSameEtab(req, target)) {
    return res.status(403).json({ message: 'Hors de votre établissement.' });
  }
  if (String(req.query.hard) === '1' && req.user.role === 'admin') {
    db.get('utilisateurs').remove({ id }).write();
    return res.json({ message: 'Agent FAD supprimé définitivement.', id });
  }
  db.get('utilisateurs').find({ id }).assign({
    actif: false,
    deleted_at: new Date().toISOString(),
    email: `deleted+agent_fad_${id}@invalid.local`,
  }).write();
  res.json({ message: 'Agent FAD supprimé (compte désactivé).', id });
});

module.exports = router;
